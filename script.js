// Konfigurasi Supabase
const SUPABASE_URL = 'https://frvcokzxlpwhpiougcpy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydmNva3p4bHB3aHBpb3VnY3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMTg4MjYsImV4cCI6MjEwMzg5NDgyNn0.ECF67GKqhOnX7kEKPDgyBpR044gAKPUZD1TARFkHNIY';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Aplikasi
let currentRoomId = localStorage.getItem('chat_room_id') || null;
let currentRoomCode = localStorage.getItem('chat_room_code') || null;
let currentParticipantId = null;
let currentUserName = localStorage.getItem('chat_user_name') || '';
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

if (currentUserName) {
    usernameInput.value = currentUserName;
}

// AUTO-RECONNECT
window.addEventListener('DOMContentLoaded', async () => {
    if (currentRoomId && currentUserName) {
        const { data: partData } = await supabaseClient
            .from('participants')
            .select('*')
            .eq('room_id', currentRoomId)
            .eq('session_id', sessionId)
            .single();

        if (partData) {
            currentParticipantId = partData.id;
            enterChatRoom();
        } else {
            clearSessionStorage();
        }
    }
});

// Penanganan viewport mobile
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        if (chatScreen.classList.contains('active')) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });
}

messageInput.addEventListener('blur', () => {
    setTimeout(() => {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
    }, 100);
});

function showError(msg) {
    errorMsg.textContent = msg;
}

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
    localStorage.setItem('chat_user_name', currentUserName);

    const roomCode = generateRoomCode();

    const { data: roomData, error: roomError } = await supabaseClient
        .from('rooms')
        .insert([{ room_code: roomCode }])
        .select()
        .single();

    if (roomError) {
        showError('Gagal membuat room. Coba lagi.');
        return;
    }

    currentRoomId = roomData.id;
    currentRoomCode = roomData.room_code;
    localStorage.setItem('chat_room_id', currentRoomId);
    localStorage.setItem('chat_room_code', currentRoomCode);

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
    localStorage.setItem('chat_user_name', currentUserName);

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
    localStorage.setItem('chat_room_id', currentRoomId);
    localStorage.setItem('chat_room_code', currentRoomCode);

    const { data: participants, error: countError } = await supabaseClient
        .from('participants')
        .select('*')
        .eq('room_id', currentRoomId);

    if (countError) {
        showError('Terjadi kesalahan sistem.');
        return;
    }

    const existingUser = participants.find(p => p.session_id === sessionId);

    if (existingUser) {
        currentParticipantId = existingUser.id;
        enterChatRoom();
        return;
    }

    if (participants.length >= 2) {
        showError('Maaf, room ini sudah penuh (maksimal 2 orang)!');
        return;
    }

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

async function enterChatRoom() {
    homeScreen.classList.remove('active');
    chatScreen.classList.add('active');
    roomCodeDisplay.textContent = `Kode: ${currentRoomCode}`;
    
    await loadParticipantsAndHeader();
    await loadMessages();
    subscribeToRealtime();
    // Jalankan setelah subscribe aktif agar event update tertangkap
    await markMessagesAsRead();
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

async function markMessagesAsRead() {
    // Ambil semua pesan yang dikirim oleh partner dan statusnya masih 'sent'
    const { data: unreadMsgs } = await supabaseClient
        .from('messages')
        .select('id')
        .eq('room_id', currentRoomId)
        .neq('sender_id', sessionId)
        .eq('status', 'sent');

    if (unreadMsgs && unreadMsgs.length > 0) {
        for (let msg of unreadMsgs) {
            // Update satu per satu menggunakan ID agar mentrigger realtime broadcast dengan akurat
            await supabaseClient
                .from('messages')
                .update({ status: 'read' })
                .eq('id', msg.id);
        }
    }
}

function appendMessage(msg) {
    let msgEl = document.getElementById(`msg-${msg.id}`);
    const isOutgoing = msg.sender_id === sessionId;
    const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let statusIcon = '';
    if (isOutgoing) {
        statusIcon = `<span class="msg-status ${msg.status === 'read' ? 'read' : ''}">${msg.status === 'read' ? '✓✓' : '✓'}</span>`;
    }

    if (msgEl) {
        const footerEl = msgEl.querySelector('.msg-footer');
        if (footerEl) {
            let existingStatusEl = footerEl.querySelector('.msg-status');
            if (isOutgoing) {
                if (existingStatusEl) {
                    existingStatusEl.className = `msg-status ${msg.status === 'read' ? 'read' : ''}`;
                    existingStatusEl.textContent = msg.status === 'read' ? '✓✓' : '✓';
                } else {
                    footerEl.insertAdjacentHTML('beforeend', `<span class="msg-status ${msg.status === 'read' ? 'read' : ''}">${msg.status === 'read' ? '✓✓' : '✓'}</span>`);
                }
            }
        }
        return;
    }

    const div = document.createElement('div');
    div.id = `msg-${msg.id}`;
    div.className = `message-item ${isOutgoing ? 'outgoing' : 'incoming'}`;

    div.innerHTML = `
        <span class="msg-sender">${escapeHtml(msg.sender_name)}</span>
        <span class="msg-text">${escapeHtml(msg.message)}</span>
        <div class="msg-footer">
            <span class="msg-time">${timeStr}</span>
            ${statusIcon}
        </div>
    `;

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

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

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = '';

    const { error } = await supabaseClient
        .from('messages')
        .insert([{
            room_id: currentRoomId,
            sender_id: sessionId,
            sender_name: currentUserName,
            message: text,
            status: 'sent'
        }]);

    if (error) {
        console.error("Gagal mengirim pesan:", error);
    }
}

btnSend.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function subscribeToRealtime() {
    if (messageSubscription) {
        supabaseClient.removeChannel(messageSubscription);
    }

    messageSubscription = supabaseClient
        .channel(`room-${currentRoomId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${currentRoomId}`
        }, payload => {
            if (payload && payload.new) {
                appendMessage(payload.new);
                // Jika pesan baru masuk dan kita sedang di room, langsung ubah statusnya jadi read via ID
                if (payload.new.sender_id !== sessionId) {
                    supabaseClient
                        .from('messages')
                        .update({ status: 'read' })
                        .eq('id', payload.new.id);
                }
            }
        })
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages'
        }, payload => {
            if (payload && payload.new && payload.new.room_id === currentRoomId) {
                appendMessage(payload.new);
            }
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

function clearSessionStorage() {
    localStorage.removeItem('chat_room_id');
    localStorage.removeItem('chat_room_code');
    currentRoomId = null;
    currentRoomCode = null;
}

btnBack.addEventListener('click', () => {
    if (messageSubscription) {
        supabaseClient.removeChannel(messageSubscription);
    }
    clearSessionStorage();
    chatScreen.classList.remove('active');
    homeScreen.classList.add('active');
    roomCodeInput.value = '';
    errorMsg.textContent = '';
});