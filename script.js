// Konfigurasi Supabase (Ganti dengan milikmu)
const SUPABASE_URL = 'https://frvcokzxlpwhpiougcpy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydmNva3p4bHB3aHBpb3VnY3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMTg4MjYsImV4cCI6MjEwMzg5NDgyNn0.ECF67GKqhOnX7kEKPDgyBpR044gAKPUZD1TARFkHNIY';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Aplikasi
let currentRoomId = null;
let currentRoomCode = null;
let currentParticipantId = null;
let currentUserName = '';
let sessionId = localStorage.getItem('chat_session_id');

if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('chat_session_id', sessionId);
}

let messageSubscription = null;

// DOM Elements
const homeScreen = document.getElementById('home-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username');
const roomCodeInput = document.getElementById('room-code-input');
const btnCreate = document.getElementById('btn-create');
const btnJoin = document.getElementById('btn-join');
const errorMsg = document.getElementById('error-msg');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const btnSend = document.getElementById('btn-send');
const btnBack = document.getElementById('btn-back');
const roomTitle = document.getElementById('room-title');
const roomCodeDisplay = document.getElementById('room-code-display');

// Helper untuk menampilkan error
function showError(msg) {
    errorMsg.textContent = msg;
}

// Generate Kode Room Unik (6 Karakter)
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// 1. BUAT ROOM BARU
btnCreate.addEventListener('click', async () => {
    const name = usernameInput.value.trim();
    if (!name) {
        showError('Silakan masukkan nama kamu terlebih dahulu!');
        return;
    }
    showError('');
    currentUserName = name;

    const roomCode = generateRoomCode();

    // Buat room di database
    const { data: roomData, error: roomError } = await supabaseClient
        .from('rooms')
        .insert([{ room_code: roomCode }])
        .select()
        .single();

    if (roomError) {
        showError('Gagal membuat room. Coba lagi.');
        console.error(roomError);
        return;
    }

    currentRoomId = roomData.id;
    currentRoomCode = roomData.room_code;

    // Masukkan pembuat sebagai participant pertama
    const { data: partData, error: partError } = await supabaseClient
        .from('participants')
        .insert([{
            room_id: currentRoomId,
            session_id: sessionId,
            name: currentUserName
        }])
        .select()
        .single();

    if (partError) {
        showError('Gagal bergabung ke room.');
        console.error(partError);
        return;
    }

    currentParticipantId = partData.id;
    enterChatRoom();
});

// 2. GABUNG CHAT DENGAN KODE
btnJoin.addEventListener('click', async () => {
    const name = usernameInput.value.trim();
    const code = roomCodeInput.value.trim().toUpperCase();

    if (!name) {
        showError('Silakan masukkan nama kamu terlebih dahulu!');
        return;
    }
    if (!code) {
        showError('Silakan masukkan kode room!');
        return;
    }
    showError('');
    currentUserName = name;

    // Cari room berdasarkan kode
    const { data: roomData, error: roomError } = await supabaseClient
        .from('rooms')
        .select('*')
        .eq('room_code', code)
        .single();

    if (roomError || !roomData) {
        showError('Room dengan kode tersebut tidak ditemukan!');
        return;
    }

    currentRoomId = roomData.id;
    currentRoomCode = roomData.room_code;

    // Cek jumlah peserta saat ini di room
    const { data: participants, error: countError } = await supabaseClient
        .from('participants')
        .select('*')
        .eq('room_id', currentRoomId);

    if (countError) {
        showError('Terjadi kesalahan sistem.');
        return;
    }

    // Cek apakah user ini sudah ada di room (re-connect / refresh)
    const existingUser = participants.find(p => p.session_id === sessionId);

    if (existingUser) {
        currentParticipantId = existingUser.id;
        enterChatRoom();
        return;
    }

    // Jika sudah ada 2 orang, tolak!
    if (participants.length >= 2) {
        showError('Maaf, room ini sudah penuh (maksimal 2 orang)!');
        return;
    }

    // Masukkan sebagai peserta kedua
    const { data: partData, error: partError } = await supabaseClient
        .from('participants')
        .insert([{
            room_id: currentRoomId,
            session_id: sessionId,
            name: currentUserName
        }])
        .select()
        .single();

    if (partError) {
        showError('Gagal bergabung ke room.');
        return;
    }

    currentParticipantId = partData.id;
    enterChatRoom();
});

// Masuk ke Tampilan Chat
async function enterChatRoom() {
    homeScreen.classList.remove('active');
    chatScreen.classList.add('active');
    roomCodeDisplay.textContent = `Kode: ${currentRoomCode}`;
    
    // Ambil nama partner jika ada
    loadParticipantsAndHeader();
    loadMessages();
    subscribeToRealtime();
}

async function loadParticipantsAndHeader() {
    const { data: participants } = await supabaseClient
        .from('participants')
        .select('*')
        .eq('room_id', currentRoomId);

    if (participants) {
        const other = participants.find(p => p.session_id !== sessionId);
        if (other) {
            roomTitle.textContent = `${currentUserName} & ${other.name}`;
        } else {
            roomTitle.textContent = `${currentUserName} (Menunggu partner...)`;
        }
    }
}

// Ambil Riwayat Pesan
async function loadMessages() {
    chatMessages.innerHTML = '';
    const { data: messages, error } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('room_id', currentRoomId)
        .order('created_at', { ascending: true });

    if (!error && messages) {
        messages.forEach(msg => appendMessage(msg));
    }
}

// Tambah Pesan ke Tampilan UI
function appendMessage(msg) {
    const div = document.createElement('div');
    const isOutgoing = msg.sender_id === sessionId;
    
    div.className = `message-item ${isOutgoing ? 'outgoing' : 'incoming'}`;

    const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
        <span class="msg-sender">${escapeHtml(msg.sender_name)}</span>
        <span class="msg-text">${escapeHtml(msg.message)}</span>
        <span class="msg-time">${timeStr}</span>
    `;

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Fungsi Keamanan Dasar HTML Escape
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Kirim Pesan
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = '';

    await supabaseClient
        .from('messages')
        .insert([{
            room_id: currentRoomId,
            sender_id: sessionId,
            sender_name: currentUserName,
            message: text
        }]);
}

btnSend.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Realtime Subscription (Mendengar pesan baru & perubahan peserta)
function subscribeToRealtime() {
    messageSubscription = supabaseClient
        .channel(`room:${currentRoomId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${currentRoomId}`
        }, payload => {
            appendMessage(payload.new);
        })
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'participants',
            filter: `room_id=eq.${currentRoomId}`
        }, () => {
            loadParticipantsAndHeader();
        })
        .subscribe();
}

// Keluar / Kembali ke Home
btnBack.addEventListener('click', () => {
    if (messageSubscription) {
        supabaseClient.removeChannel(messageSubscription);
    }
    chatScreen.classList.remove('active');
    homeScreen.classList.add('active');
    roomCodeInput.value = '';
    errorMsg.textContent = '';
    currentRoomId = null;
    currentRoomCode = null;
});
