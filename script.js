// Konfigurasi Supabase
const SUPABASE_URL = 'https://frvcokzxlpwhpiougcpy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydmNva3p4bHB3aHBpb3VnY3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMTg4MjYsImV4cCI6MjEwMzg5NDgyNn0.ECF67GKqhOnX7kEKPDgyBpR044gAKPUZD1TARFkHNIY';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Aplikasi
let currentUserId = localStorage.getItem('chat_user_id') || null;
let currentUsername = localStorage.getItem('chat_username') || null;
let currentUserAvatar = localStorage.getItem('chat_avatar') || null;
let activeFriendId = null;
let activeFriendName = null;
let activeFriendAvatar = null;
let replyingToMessageId = null;
let selectedMessageForAction = null;

let chatSubscription = null;
let homeSubscription = null;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const registerScreen = document.getElementById('register-screen');
const homeScreen = document.getElementById('home-screen');
const profileScreen = document.getElementById('profile-screen');
const chatScreen = document.getElementById('chat-screen');

const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const btnLogin = document.getElementById('btn-login');
const loginError = document.getElementById('login-error');
const toRegisterBtn = document.getElementById('to-register');

const regUsernameInput = document.getElementById('reg-username');
const regPasswordInput = document.getElementById('reg-password');
const regConfirmPasswordInput = document.getElementById('reg-confirm-password');
const btnRegister = document.getElementById('btn-register');
const regError = document.getElementById('reg-error');
const toLoginBtn = document.getElementById('to-login');

const myProfileName = document.getElementById('my-profile-name');
const myHeaderAvatar = document.getElementById('my-header-avatar');
const btnOpenProfile = document.getElementById('btn-open-profile');
const btnBackProfile = document.getElementById('btn-back-profile');
const btnLogout = document.getElementById('btn-logout');

const profileLargeAvatar = document.getElementById('profile-large-avatar');
const profileLargeImg = document.getElementById('profile-large-img');
const btnChangePhoto = document.getElementById('btn-change-photo');
const avatarFileInput = document.getElementById('avatar-file-input');
const profileStatus = document.getElementById('profile-status');

const friendUsernameInput = document.getElementById('friend-username-input');
const btnAddFriend = document.getElementById('btn-add-friend');
const homeError = document.getElementById('home-error');
const friendsList = document.getElementById('friends-list');

const chatPartnerName = document.getElementById('chat-partner-name');
const chatPartnerAvatarContainer = document.getElementById('chat-partner-avatar-container');
const btnBack = document.getElementById('btn-back');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const btnSend = document.getElementById('btn-send');

const replyPreviewBox = document.getElementById('reply-preview-box');
const replyingToUser = document.getElementById('replying-to-user');
const replyingToText = document.getElementById('replying-to-text');
const btnCancelReply = document.getElementById('btn-cancel-reply');

const messageOptionsModal = document.getElementById('message-options-modal');
const optReply = document.getElementById('opt-reply');
const optDeleteMe = document.getElementById('opt-delete-me');
const optDeleteAll = document.getElementById('opt-delete-all');
const optCancel = document.getElementById('opt-cancel');

let messageCache = {};

window.addEventListener('DOMContentLoaded', async () => {
    if (currentUserId && currentUsername) {
        const { data } = await supabaseClient.from('profiles').select('*').eq('id', currentUserId).single();
        if (data) {
            currentUserAvatar = data.avatar_url;
            saveLocalStorage();
            showHomeScreen();
        } else {
            clearLocalStorage();
        }
    }
});

toRegisterBtn.addEventListener('click', () => { loginScreen.classList.remove('active'); registerScreen.classList.add('active'); });
toLoginBtn.addEventListener('click', () => { registerScreen.classList.remove('active'); loginScreen.classList.add('active'); });

// REGISTER
btnRegister.addEventListener('click', async () => {
    const username = regUsernameInput.value.trim().toLowerCase();
    const password = regPasswordInput.value.trim();
    const confirmPassword = regConfirmPasswordInput.value.trim();

    if (!username || !password || !confirmPassword) { regError.textContent = 'Semua kolom wajib diisi!'; return; }
    if (password !== confirmPassword) { regError.textContent = 'Konfirmasi password tidak cocok!'; return; }
    regError.textContent = '';

    const { data: existingUser } = await supabaseClient.from('profiles').select('*').eq('username', username).single();
    if (existingUser) { regError.textContent = 'Username sudah dipakai orang lain!'; return; }

    const { error: insertError } = await supabaseClient.from('profiles').insert([{ username, password }]);
    if (insertError) { regError.textContent = 'Gagal mendaftar.'; return; }

    alert('Akun berhasil dibuat! Silakan masuk.');
    registerScreen.classList.remove('active');
    loginScreen.classList.add('active');
});

// LOGIN
btnLogin.addEventListener('click', async () => {
    const username = loginUsernameInput.value.trim().toLowerCase();
    const password = loginPasswordInput.value.trim();

    if (!username || !password) { loginError.textContent = 'Masukkan username & password!'; return; }
    loginError.textContent = '';

    const { data: user, error } = await supabaseClient.from('profiles').select('*').eq('username', username).single();
    if (error || !user || user.password !== password) { loginError.textContent = 'Username atau password salah!'; return; }

    currentUserId = user.id;
    currentUsername = user.username;
    currentUserAvatar = user.avatar_url;
    saveLocalStorage();
    showHomeScreen();
});

function showHomeScreen() {
    loginScreen.classList.remove('active');
    registerScreen.classList.remove('active');
    profileScreen.classList.remove('active');
    chatScreen.classList.remove('active');
    homeScreen.classList.add('active');
    myProfileName.textContent = `@${currentUsername}`;
    renderAvatar(myHeaderAvatar, null, currentUsername);
    loadFriends(true);
    subscribeHomeRealtime();
}

// BUKA HALAMAN PROFIL
btnOpenProfile.addEventListener('click', () => {
    homeScreen.classList.remove('active');
    profileScreen.classList.add('active');
    renderProfileAvatar();
    profileStatus.textContent = '';
});

btnBackProfile.addEventListener('click', () => {
    profileScreen.classList.remove('active');
    homeScreen.classList.add('active');
    loadFriends(false);
});

function renderProfileAvatar() {
    if (currentUserAvatar) {
        profileLargeAvatar.style.display = 'none';
        profileLargeImg.style.display = 'block';
        profileLargeImg.src = currentUserAvatar;
    } else {
        profileLargeImg.style.display = 'none';
        profileLargeAvatar.style.display = 'flex';
        profileLargeAvatar.textContent = currentUsername.charAt(0).toUpperCase();
    }
}

// UPLOAD FOTO PROFIL KE SUPABASE STORAGE
btnChangePhoto.addEventListener('click', () => avatarFileInput.click());

avatarFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    profileStatus.textContent = 'Mengunggah foto...';

    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUserId}_${Math.random().toString(36.substring(2))}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload ke bucket 'avatars'
    const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        profileStatus.style.color = '#dc3545';
        profileStatus.textContent = 'Gagal mengunggah foto.';
        return;
    }

    // Ambil Public URL
    const { data: publicUrlData } = supabaseClient.storage
        .from('avatars')
        .getPublicUrl(filePath);

    const avatarUrl = publicUrlData.publicUrl;

    // Simpan ke tabel profiles
    const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', currentUserId);

    if (updateError) {
        profileStatus.style.color = '#dc3545';
        profileStatus.textContent = 'Gagal memperbarui profil.';
        return;
    }

    currentUserAvatar = avatarUrl;
    saveLocalStorage();
    renderProfileAvatar();
    renderAvatar(myHeaderAvatar, currentUserAvatar, currentUsername);

    profileStatus.style.color = '#28a745';
    profileStatus.textContent = 'Foto profil berhasil diperbarui!';
});

// BANTU FUNGSI RENDER AVATAR (GAMBAR ATAU INISIAL)
function renderAvatar(containerEl, avatarUrl, username, size = '36px') {
    containerEl.style.width = size;
    containerEl.style.height = size;
    containerEl.innerHTML = '';
    
    if (avatarUrl) {
        const img = document.createElement('img');
        img.src = avatarUrl;
        containerEl.appendChild(img);
    } else {
        containerEl.textContent = username ? username.charAt(0).toUpperCase() : '?';
        containerEl.style.fontSize = parseInt(size) * 0.4 + 'px';
    }
}

// TAMBAH TEMAN
btnAddFriend.addEventListener('click', async () => {
    const targetUsername = friendUsernameInput.value.trim().toLowerCase();
    if (!targetUsername) return;
    if (targetUsername === currentUsername) { homeError.textContent = 'Tidak bisa menambahkan diri sendiri!'; return; }
    homeError.textContent = '';

    const { data: targetUser, error: searchError } = await supabaseClient.from('profiles').select('*').eq('username', targetUsername).single();
    if (searchError || !targetUser) { homeError.textContent = 'Username tidak ditemukan!'; return; }

    await supabaseClient.from('friendships').insert([
        { user_id: currentUserId, friend_id: targetUser.id },
        { user_id: targetUser.id, friend_id: currentUserId }
    ]);
    friendUsernameInput.value = '';
    loadFriends(true);
});

// MUAT DAFTAR TEMAN
async function loadFriends(isInitial = false) {
    const { data: friendships } = await supabaseClient.from('friendships').select('friend_id').eq('user_id', currentUserId);
    if (!friendships || friendships.length === 0) {
        if (isInitial) friendsList.innerHTML = '<p style="padding: 20px; text-align: center; color: #888; font-size: 13px;">Belum ada teman.</p>';
        return;
    }

    const friendIds = friendships.map(f => f.friend_id);
    const { data: friendsProfiles } = await supabaseClient.from('profiles').select('*').in('id', friendIds);
    if (!friendsProfiles) return;
    if (isInitial) friendsList.innerHTML = '';

    for (const friend of friendsProfiles) {
        const { data: lastMsgs } = await supabaseClient
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${currentUserId})`)
            .order('created_at', { ascending: false })
            .limit(1);

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
            if (msg.is_deleted_for_all) {
                lastMsgText = 'Pesan telah dihapus';
            } else {
                const prefix = msg.sender_id === currentUserId ? 'Kamu: ' : '';
                lastMsgText = prefix + msg.message;
            }
            const msgDate = new Date(msg.created_at);
            const today = new Date();
            timeStr = msgDate.toDateString() === today.toDateString() 
                ? msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : msgDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }

        let friendEl = document.getElementById(`friend-${friend.id}`);
        
        if (friendEl) {
            friendEl.className = `friend-item ${isUnread ? 'unread' : ''}`;
            const avatarDiv = friendEl.querySelector('.friend-avatar');
            renderAvatar(avatarDiv, friend.avatar_url, friend.username, '44px');
            friendEl.querySelector('.friend-time').textContent = timeStr;
            friendEl.querySelector('.friend-last-msg').textContent = lastMsgText;
            
            const bottomRow = friendEl.querySelector('.friend-bottom-row');
            let badgeEl = bottomRow.querySelector('.unread-badge');
            if (isUnread) {
                if (badgeEl) badgeEl.textContent = unreadCount;
                else bottomRow.insertAdjacentHTML('beforeend', `<span class="unread-badge">${unreadCount}</span>`);
            } else if (badgeEl) {
                badgeEl.remove();
            }
        } else {
            const div = document.createElement('div');
            div.id = `friend-${friend.id}`;
            div.className = `friend-item ${isUnread ? 'unread' : ''}`;
            div.innerHTML = `
                <div class="friend-avatar"></div>
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
            renderAvatar(div.querySelector('.friend-avatar'), friend.avatar_url, friend.username, '44px');
            div.addEventListener('click', () => openChatRoom(friend.id, friend.username, friend.avatar_url));
            friendsList.appendChild(div);
        }
    }
}

// BUKA RUANG CHAT
async function openChatRoom(friendId, friendName, friendAvatar) {
    if (homeSubscription) supabaseClient.removeChannel(homeSubscription);

    activeFriendId = friendId;
    activeFriendName = friendName;
    activeFriendAvatar = friendAvatar;
    cancelReply();

    homeScreen.classList.remove('active');
    chatScreen.classList.add('active');
    chatPartnerName.textContent = `@${friendName}`;
    renderAvatar(chatPartnerAvatarContainer, friendAvatar, friendName, '36px');

    await loadMessages();
    await markMessagesAsRead();
    subscribeToRealtime();
}

async function loadMessages() {
    chatMessages.innerHTML = '';
    messageCache = {};

    const { data: messages, error } = await supabaseClient
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeFriendId}),and(sender_id.eq.${activeFriendId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });

    if (!error && messages) {
        messages.forEach(msg => {
            messageCache[msg.id] = msg;
            if (msg.sender_id === currentUserId && msg.deleted_for_sender) return;
            if (msg.receiver_id === currentUserId && msg.deleted_for_receiver) return;
            appendMessage(msg);
        });
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
    messageCache[msg.id] = msg;
    if (msg.sender_id === currentUserId && msg.deleted_for_sender) return;
    if (msg.receiver_id === currentUserId && msg.deleted_for_receiver) return;

    let wrapperEl = document.getElementById(`msg-wrap-${msg.id}`);
    const isOutgoing = msg.sender_id === currentUserId;
    const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let statusIcon = '';
    if (isOutgoing) {
        statusIcon = `<span class="msg-status ${msg.status === 'read' ? 'read' : ''}">${msg.status === 'read' ? '✓✓' : '✓'}</span>`;
    }

    let displayContent = escapeHtml(msg.message);
    if (msg.is_deleted_for_all) {
        displayContent = '<em style="color: #888;">Pesan ini telah dihapus</em>';
    }

    let replyHtml = '';
    if (!msg.is_deleted_for_all && msg.reply_to && messageCache[msg.reply_to]) {
        const repliedMsg = messageCache[msg.reply_to];
        const repliedSender = repliedMsg.sender_id === currentUserId ? 'Kamu' : `@${activeFriendName}`;
        replyHtml = `
            <div class="quoted-msg">
                <span class="quoted-sender">${repliedSender}</span>
                <span>${repliedMsg.is_deleted_for_all ? 'Pesan telah dihapus' : escapeHtml(repliedMsg.message)}</span>
            </div>
        `;
    }

    if (wrapperEl) {
        const msgItem = wrapperEl.querySelector('.message-item');
        msgItem.innerHTML = `
            ${replyHtml}
            <span class="msg-text">${displayContent}</span>
            <div class="msg-footer">
                <span class="msg-time">${timeStr}</span>
                ${statusIcon}
            </div>
        `;
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.id = `msg-wrap-${msg.id}`;
    wrapper.className = `message-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}`;

    const div = document.createElement('div');
    div.id = `msg-${msg.id}`;
    div.className = `message-item ${isOutgoing ? 'outgoing' : 'incoming'}`;

    div.innerHTML = `
        ${replyHtml}
        <span class="msg-text">${displayContent}</span>
        <div class="msg-footer">
            <span class="msg-time">${timeStr}</span>
            ${statusIcon}
        </div>
    `;

    // Swipe to Reply
    let startX = 0;
    div.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; });
    div.addEventListener('touchmove', (e) => {
        let diff = e.touches[0].clientX - startX;
        if (diff > 0 && diff < 100) wrapper.style.transform = `translateX(${diff}px)`;
    });
    div.addEventListener('touchend', (e) => {
        let diff = e.changedTouches[0].clientX - startX;
        wrapper.style.transform = `translateX(0px)`;
        if (diff > 60 && !msg.is_deleted_for_all) {
            triggerReply(msg.id, isOutgoing ? 'Kamu' : `@${activeFriendName}`, msg.message);
        }
    });

    // Long Press Menu
    let pressTimer;
    div.addEventListener('mousedown', () => { pressTimer = setTimeout(() => openMessageOptions(msg), 600); });
    div.addEventListener('mouseup', () => clearTimeout(pressTimer));
    div.addEventListener('touchstart', () => { pressTimer = setTimeout(() => openMessageOptions(msg), 600); });
    div.addEventListener('touchend', () => clearTimeout(pressTimer));

    wrapper.appendChild(div);
    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function openMessageOptions(msg) {
    selectedMessageForAction = msg;
    if (msg.is_deleted_for_all) return;

    if (msg.sender_id !== currentUserId) {
        optDeleteAll.style.display = 'none';
    } else {
        optDeleteAll.style.display = 'block';
    }
    messageOptionsModal.classList.add('active');
}

optCancel.addEventListener('click', () => { messageOptionsModal.classList.remove('active'); });

optReply.addEventListener('click', () => {
    messageOptionsModal.classList.remove('active');
    const msg = selectedMessageForAction;
    const isOutgoing = msg.sender_id === currentUserId;
    triggerReply(msg.id, isOutgoing ? 'Kamu' : `@${activeFriendName}`, msg.message);
});

optDeleteMe.addEventListener('click', async () => {
    messageOptionsModal.classList.remove('active');
    const msg = selectedMessageForAction;
    const isSender = msg.sender_id === currentUserId;

    const updateField = isSender ? { deleted_for_sender: true } : { deleted_for_receiver: true };
    await supabaseClient.from('messages').update(updateField).eq('id', msg.id);

    const el = document.getElementById(`msg-wrap-${msg.id}`);
    if (el) el.remove();
});

optDeleteAll.addEventListener('click', async () => {
    messageOptionsModal.classList.remove('active');
    const msg = selectedMessageForAction;
    await supabaseClient.from('messages').update({ is_deleted_for_all: true, message: '' }).eq('id', msg.id);
});

function triggerReply(msgId, senderLabel, text) {
    replyingToMessageId = msgId;
    replyingToUser.textContent = `Membalas ke ${senderLabel}`;
    replyingToText.textContent = text;
    replyPreviewBox.classList.add('active');
    messageInput.focus();
}

function cancelReply() {
    replyingToMessageId = null;
    replyPreviewBox.classList.remove('active');
}

btnCancelReply.addEventListener('click', cancelReply);

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    const replyId = replyingToMessageId;
    messageInput.value = '';
    cancelReply();

    await supabaseClient.from('messages').insert([{
        sender_id: currentUserId,
        receiver_id: activeFriendId,
        message: text,
        status: 'sent',
        reply_to: replyId || null
    }]);
}

btnSend.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

function subscribeToRealtime() {
    if (chatSubscription) supabaseClient.removeChannel(chatSubscription);

    const sortedIds = [currentUserId, activeFriendId].sort().join('-');

    chatSubscription = supabaseClient
        .channel(`room-${sortedIds}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async payload => {
            if (payload && payload.new) {
                const msg = payload.new;
                if (
                    (msg.sender_id === activeFriendId && msg.receiver_id === currentUserId) ||
                    (msg.sender_id === currentUserId && msg.receiver_id === activeFriendId)
                ) {
                    appendMessage(msg);
                    if (msg.sender_id === activeFriendId && msg.receiver_id === currentUserId) {
                        await supabaseClient.from('messages').update({ status: 'read' }).eq('id', msg.id);
                    }
                }
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
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

function subscribeHomeRealtime() {
    if (homeSubscription) supabaseClient.removeChannel(homeSubscription);

    homeSubscription = supabaseClient
        .channel(`home-${currentUserId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` }, () => {
            if (homeScreen.classList.contains('active')) loadFriends(false);
        })
        .subscribe();
}

document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
        if (chatScreen.classList.contains('active') && activeFriendId) {
            await loadMessages();
            await markMessagesAsRead();
            subscribeToRealtime();
        } else if (homeScreen.classList.contains('active')) {
            loadFriends(false);
            subscribeHomeRealtime();
        }
    }
});

function saveLocalStorage() {
    localStorage.setItem('chat_user_id', currentUserId);
    localStorage.setItem('chat_username', currentUsername);
    if (currentUserAvatar) localStorage.setItem('chat_avatar', currentUserAvatar);
}

function clearLocalStorage() {
    localStorage.removeItem('chat_user_id');
    localStorage.removeItem('chat_username');
    localStorage.removeItem('chat_avatar');
    currentUserId = null;
    currentUsername = null;
    currentUserAvatar = null;
}

btnBack.addEventListener('click', () => {
    if (chatSubscription) supabaseClient.removeChannel(chatSubscription);
    chatScreen.classList.remove('active');
    homeScreen.classList.add('active');
    loadFriends(true);
    subscribeHomeRealtime();
});

btnLogout.addEventListener('click', () => {
    clearLocalStorage();
    location.reload();
});