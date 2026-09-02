// Konfigurasi Supabase
const SUPABASE_URL = 'https://frvcokzxlpwhpiougcpy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydmNva3p4bHB3aHBpb3VnY3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMTg4MjYsImV4cCI6MjEwMzg5NDgyNn0.ECF67GKqhOnX7kEKPDgyBpR044gAKPUZD1TARFkHNIY';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Aplikasi
let currentUserId = localStorage.getItem('chat_user_id') || null;
let currentUsername = localStorage.getItem('chat_username') || null;
let activeFriendId = null;
let activeFriendName = null;
let sessionId = localStorage.getItem('chat_session_id');

if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('chat_session_id', sessionId);
}

let chatSubscription = null;
let homeSubscription = null;

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const homeScreen = document.getElementById('home-screen');
const chatScreen = document.getElementById('chat-screen');

const createUsernameInput = document.getElementById('create-username');
const btnSaveUsername = document.getElementById('btn-save-username');
const setupError = document.getElementById('setup-error');

const myProfileName = document.getElementById('my-profile-name');
const btnLogout = document.getElementById('btn-logout');
const friendUsernameInput = document.getElementById('friend-username-input');
const btnAddFriend = document.getElementById('btn-add-friend');
const homeError = document.getElementById('home-error');
const friendsList = document.getElementById('friends-list');

const chatPartnerName = document.getElementById('chat-partner-name');
const btnBack = document.getElementById('btn-back');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const btnSend = document.getElementById('btn-send');

// AUTO-LOGIN CHECK
window.addEventListener('DOMContentLoaded', async () => {
    if (currentUserId && currentUsername) {
        const { data } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', currentUserId)
            .single();

        if (data) {
            showHomeScreen();
        } else {
            clearLocalStorage();
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

// 1. BUAT / MASUK DENGAN USERNAME
btnSaveUsername.addEventListener('click', async () => {
    const uname = createUsernameInput.value.trim().toLowerCase();
    if (!uname) {
        setupError.textContent = 'Masukkan username terlebih dahulu!';
        return;
    }
    setupError.textContent = '';

    const { data: existing } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('username', uname)
        .single();

    if (existing) {
        if (existing.session_id === sessionId) {
            currentUserId = existing.id;
            currentUsername = existing.username;
            saveLocalStorage();
            showHomeScreen();
        } else {
            setupError.textContent = 'Username sudah digunakan orang lain. Pilih yang lain!';
        }
        return;
    }

    const { data: newProfile, error } = await supabaseClient
        .from('profiles')
        .insert([{ username: uname, session_id: sessionId }])
        .select()
        .single();

    if (error) {
        setupError.textContent = 'Gagal membuat akun. Coba lagi.';
        return;
    }

    currentUserId = newProfile.id;
    currentUsername = newProfile.username;
    saveLocalStorage();
    showHomeScreen();
});

function showHomeScreen() {
    setupScreen.classList.remove('active');
    chatScreen.classList.remove('active');
    homeScreen.classList.add('active');
    myProfileName.textContent = `@${currentUsername}`;
    loadFriends();
    subscribeHomeRealtime();
}

// 2. TAMBAH TEMAN BERDASARKAN USERNAME
btnAddFriend.addEventListener('click', async () => {
    const targetUsername = friendUsernameInput.value.trim().toLowerCase();
    if (!targetUsername) {
        homeError.textContent = 'Masukkan username teman!';
        return;
    }
    if (targetUsername === currentUsername) {
        homeError.textContent = 'Tidak bisa menambahkan diri sendiri!';
        return;
    }
    homeError.textContent = '';

    const { data: targetUser, error: searchError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('username', targetUsername)
        .single();

    if (searchError || !targetUser) {
        homeError.textContent = 'Username tidak ditemukan!';
        return;
    }

    await supabaseClient
        .from('friendships')
        .insert([
            { user_id: currentUserId, friend_id: targetUser.id },
            { user_id: targetUser.id, friend_id: currentUserId }
        ]);

    friendUsernameInput.value = '';
    loadFriends();
});

// 3. MUAT DAFTAR TEMAN DENGAN PREVIEW PESAN & INDIKATOR
async function loadFriends() {
    friendsList.innerHTML = '';
    const { data: friendships, error } = await supabaseClient
        .from('friendships')
        .select('friend_id')
        .eq('user_id', currentUserId);

    if (error || !friendships || friendships.length === 0) {
        friendsList.innerHTML = '<p style="padding: 20px; text-align: center; color: #888; font-size: 13px;">Belum ada teman. Tambahkan username teman di atas!</p>';
        return;
    }

    const friendIds = friendships.map(f => f.friend_id);

    const { data: friendsProfiles } = await supabaseClient
        .from('profiles')
        .select('*')
        .in('id', friendIds);

    if (friendsProfiles) {
        for (const friend of friendsProfiles) {
            // Ambil pesan terakhir antara user dan teman ini
            const { data: lastMsgs } = await supabaseClient
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${currentUserId})`)
                .order('created_at', { ascending: false })
                .limit(1);

            // Hitung pesan belum dibaca dari teman ini
            const { count: unreadCount } = await supabaseClient
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('sender_id', friend.id)
                .eq('receiver_id', currentUserId)
                .eq('status', 'sent');

            let lastMsgText = 'Belum ada percakapan';
            let timeStr = '';
            let isUnread = unreadCount > 0;

            if (lastMsgs && lastMsgs.length > 0) {
                const msg = lastMsgs[0];
                const prefix = msg.sender_id === currentUserId ? 'Kamu: ' : '';
                lastMsgText = prefix + msg.message;
                const msgDate = new Date(msg.created_at);
                const today = new Date();
                if (msgDate.toDateString() === today.toDateString()) {
                    timeStr = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else {
                    timeStr = msgDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                }
            }

            const div = document.createElement('div');
            div.className = `friend-item ${isUnread ? 'unread' : ''}`;
            div.innerHTML = `
                <div class="friend-avatar">${friend.username.charAt(0).toUpperCase()}</div>
                <div class="friend-info">
                    <div class="friend-top-row">
                        <span class="friend-name">@${friend.username}</span>
                        <span class="friend-time">${timeStr}</span>
                    </div>
                    <div class="friend-bottom-row">
                        <span class="friend-last-msg">${escapeHtml(lastMsgText)}</span>
                        ${isUnread ? `<span class="unread-badge">${unreadCount}</span>` : ''}
                    </div>
                </div>
            `;
            div.addEventListener('click', () => openChatRoom(friend.id, friend.username));
            friendsList.appendChild(div);
        }
    }
}

// 4. BUKA RUANG CHAT DENGAN TEMAN
async function openChatRoom(friendId, friendName) {
    if (homeSubscription) {
        supabaseClient.removeChannel(homeSubscription);
    }

    activeFriendId = friendId;
    activeFriendName = friendName;

    homeScreen.classList.remove('active');
    chatScreen.classList.add('active');
    chatPartnerName.textContent = `@${friendName}`;

    await loadMessages();
    await markMessagesAsRead();
    subscribeToRealtime();
}

async function loadMessages() {
    chatMessages.innerHTML = '';
    const { data: messages, error } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeFriendId}),and(sender_id.eq.${activeFriendId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });

    if (!error && messages) {
        messages.forEach(msg => appendMessage(msg));
    }
}

async function markMessagesAsRead() {
    await supabaseClient
        .from('messages')
        .update({ status: 'read' })
        .eq('sender_id', activeFriendId)
        .eq('receiver_id', currentUserId)
        .eq('status', 'sent');
}

function appendMessage(msg) {
    let msgEl = document.getElementById(`msg-${msg.id}`);
    const isOutgoing = msg.sender_id === currentUserId;
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
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = '';

    const { error } = await supabaseClient
        .from('messages')
        .insert([{
            sender_id: currentUserId,
            receiver_id: activeFriendId,
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

// 5. REALTIME LISTENER DI HALAMAN CHAT
function subscribeToRealtime() {
    if (chatSubscription) {
        supabaseClient.removeChannel(chatSubscription);
    }

    const sortedIds = [currentUserId, activeFriendId].sort().join('-');

    chatSubscription = supabaseClient
        .channel(`room-${sortedIds}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
        }, async payload => {
            if (payload && payload.new) {
                const msg = payload.new;
                if (
                    (msg.sender_id === activeFriendId && msg.receiver_id === currentUserId) ||
                    (msg.sender_id === currentUserId && msg.receiver_id === activeFriendId)
                ) {
                    appendMessage(msg);
                    if (msg.sender_id === activeFriendId && msg.receiver_id === currentUserId) {
                        await supabaseClient
                            .from('messages')
                            .update({ status: 'read' })
                            .eq('id', msg.id);
                    }
                }
            }
        })
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages'
        }, payload => {
            if (payload && payload.new) {
                const msg = payload.new;
                if (
                    (msg.sender_id === activeFriendId && msg.receiver_id === currentUserId) ||
                    (msg.sender_id === currentUserId && msg.receiver_id === activeFriendId)
                ) {
                    appendMessage(msg);
                }
            }
        })
        .subscribe();
}

// 6. REALTIME LISTENER DI HALAMAN HOME (UNTUK UPDATE PREVIEW KONTAK SECARA LIVE)
function subscribeHomeRealtime() {
    if (homeSubscription) {
        supabaseClient.removeChannel(homeSubscription);
    }

    homeSubscription = supabaseClient
        .channel(`home-${currentUserId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${currentUserId}`
        }, () => {
            if (homeScreen.classList.contains('active')) {
                loadFriends();
            }
        })
        .subscribe();
}

// Otomatis sinkronisasi ulang saat PWA kembali dibuka / aktif di layar
document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
        if (chatScreen.classList.contains('active') && activeFriendId) {
            await loadMessages();
            await markMessagesAsRead();
            subscribeToRealtime();
        } else if (homeScreen.classList.contains('active')) {
            loadFriends();
            subscribeHomeRealtime();
        }
    }
});

function saveLocalStorage() {
    localStorage.setItem('chat_user_id', currentUserId);
    localStorage.setItem('chat_username', currentUsername);
}

function clearLocalStorage() {
    localStorage.removeItem('chat_user_id');
    localStorage.removeItem('chat_username');
    currentUserId = null;
    currentUsername = null;
}

btnBack.addEventListener('click', () => {
    if (chatSubscription) {
        supabaseClient.removeChannel(chatSubscription);
    }
    chatScreen.classList.remove('active');
    homeScreen.classList.add('active');
    loadFriends();
    subscribeHomeRealtime();
});

btnLogout.addEventListener('click', () => {
    clearLocalStorage();
    location.reload();
});