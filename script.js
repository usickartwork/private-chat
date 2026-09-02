const SUPABASE_URL = 'https://frvcokzxlpwhpiougcpy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZydmNva3p4bHB3aHBpb3VnY3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMTg4MjYsImV4cCI6MjEwMzg5NDgyNn0.ECF67GKqhOnX7kEKPDgyBpR044gAKPUZD1TARFkHNIY';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
let profileStatusSubscription = null;
let typingChannel = null;
let typingTimeout = null;

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
const profileDisplayUsername = document.getElementById('profile-display-username');

const friendUsernameInput = document.getElementById('friend-username-input');
const btnAddFriend = document.getElementById('btn-add-friend');
const homeError = document.getElementById('home-error');
const friendsList = document.getElementById('friends-list');

const chatPartnerName = document.getElementById('chat-partner-name');
const chatStatusIndicator = document.getElementById('chat-status-indicator');
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

// Elemen Game Tic-Tac-Toe
const btnInviteGame = document.getElementById('btn-invite-game');
const gameModal = document.getElementById('game-modal');
const btnCloseGame = document.getElementById('btn-close-game');
const gameCells = document.querySelectorAll('.game-cell');
const gameStatusText = document.getElementById('game-status-text');

let gameState = ['', '', '', '', '', '', '', '', ''];
let isMyTurn = false;
let mySymbol = '';
let opponentSymbol = '';
let gameActive = false;
let activeGameSymbolsMap = {};

let messageCache = {};

window.addEventListener('DOMContentLoaded', async () => {
    loginScreen.classList.remove('active');
    registerScreen.classList.remove('active');
    homeScreen.classList.remove('active');
    profileScreen.classList.remove('active');
    if (chatScreen) chatScreen.classList.remove('active');

    history.replaceState({ screen: 'home' }, '');

    if (currentUserId && currentUsername) {
        const { data } = await supabaseClient.from('profiles').select('*').eq('id', currentUserId).single();
        if (data) {
            currentUserAvatar = data.avatar_url;
            saveLocalStorage();
            showHomeScreen(false);
        } else {
            clearLocalStorage();
            loginScreen.classList.add('active');
        }
    } else {
        loginScreen.classList.add('active');
    }
});

window.addEventListener('popstate', (event) => {
    messageOptionsModal.classList.remove('active');
    if (gameModal) gameModal.classList.remove('active');

    if (chatScreen && chatScreen.classList.contains('active')) {
        closeChatRoomInternal(false);
    } else if (profileScreen.classList.contains('active')) {
        profileScreen.classList.remove('active');
        homeScreen.classList.add('active');
        loadFriends();
    }
});

toRegisterBtn.addEventListener('click', () => { loginScreen.classList.remove('active'); registerScreen.classList.add('active'); });
toLoginBtn.addEventListener('click', () => { registerScreen.classList.remove('active'); loginScreen.classList.add('active'); });

btnRegister.addEventListener('click', async () => {
    const username = regUsernameInput.value.trim().toLowerCase();
    const password = regPasswordInput.value.trim();
    const confirmPassword = regConfirmPasswordInput.value.trim();

    if (!username || !password || !confirmPassword) { regError.textContent = 'Semua kolom wajib diisi!'; return; }
    if (password !== confirmPassword) { regError.textContent = 'Konfirmasi password tidak cocok!'; return; }
    regError.textContent = '';

    const { data: existingUser } = await supabaseClient.from('profiles').select('*').eq('username', username).single();
    if (existingUser) { regError.textContent = 'Username sudah dipakai orang lain!'; return; }

    const { error: insertError } = await supabaseClient.from('profiles').insert([{ username, password, is_online: false }]);
    if (insertError) { regError.textContent = 'Gagal mendaftar.'; return; }

    alert('Akun berhasil dibuat! Silakan masuk.');
    registerScreen.classList.remove('active');
    loginScreen.classList.add('active');
});

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
    showHomeScreen(true);
});

async function showHomeScreen(pushHistory = true) {
    loginScreen.classList.remove('active');
    registerScreen.classList.remove('active');
    profileScreen.classList.remove('active');
    if (chatScreen) chatScreen.classList.remove('active');
    homeScreen.classList.add('active');
    if (myProfileName) myProfileName.textContent = `@${currentUsername}`;
    renderAvatar(myHeaderAvatar, currentUserAvatar, currentUsername);

    await supabaseClient.from('profiles').update({ is_online: true }).eq('id', currentUserId);

    loadFriends();
    subscribeHomeRealtime();
    if (pushHistory) {
        history.replaceState({ screen: 'home' }, '');
    }
}

if (btnOpenProfile) {
    btnOpenProfile.addEventListener('click', () => {
        homeScreen.classList.remove('active');
        profileScreen.classList.add('active');
        renderProfileAvatar();
        if (profileDisplayUsername) profileDisplayUsername.textContent = `@${currentUsername}`;
        profileStatus.textContent = '';
        history.pushState({ screen: 'profile' }, '');
    });
}

if (btnBackProfile) {
    btnBackProfile.addEventListener('click', () => {
        history.back();
    });
}

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

if (btnChangePhoto) {
    btnChangePhoto.addEventListener('click', () => avatarFileInput.click());
}

if (avatarFileInput) {
    avatarFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        profileStatus.style.color = '#007bff';
        profileStatus.textContent = 'Mengunggah foto...';

        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUserId}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabaseClient.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true });

        if (uploadError) {
            profileStatus.style.color = '#dc3545';
            profileStatus.textContent = 'Gagal mengunggah foto.';
            return;
        }

        const { data: publicUrlData } = supabaseClient.storage
            .from('avatars')
            .getPublicUrl(filePath);

        const avatarUrl = publicUrlData.publicUrl;

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
}

function renderAvatar(containerEl, avatarUrl, username, size = '36px') {
    if (!containerEl) return;
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

if (btnAddFriend) {
    btnAddFriend.addEventListener('click', async () => {
        const targetUsername = friendUsernameInput.value.trim().toLowerCase();
        if (!targetUsername) return;
        if (targetUsername === currentUsername) { homeError.textContent = 'Tidak bisa menambahkan diri sendiri!'; return; }
        homeError.textContent = '';

        const { data: targetUser, error: searchError } = await supabaseClient.from('profiles').select('*').eq('username', targetUsername).single();
        if (searchError || !targetUser) { homeError.textContent = 'Username tidak ditemukan!'; return; }

        const { data: existingFriend } = await supabaseClient
            .from('friendships')
            .select('*')
            .eq('user_id', currentUserId)
            .eq('friend_id', targetUser.id)
            .single();

        if (existingFriend) {
            homeError.textContent = 'Teman sudah ada di daftar kontak!';
            return;
        }

        await supabaseClient.from('friendships').insert([
            { user_id: currentUserId, friend_id: targetUser.id },
            { user_id: targetUser.id, friend_id: currentUserId }
        ]);
        friendUsernameInput.value = '';
        homeError.style.color = '#28a745';
        homeError.textContent = 'Teman berhasil ditambahkan!';
        loadFriends();
    });
}

async function loadFriends() {
    if (!currentUserId) return;

    const { data: friendships } = await supabaseClient.from('friendships').select('friend_id').eq('user_id', currentUserId);
    if (!friendships || friendships.length === 0) {
        if (!friendsList.hasChildNodes() || friendsList.innerHTML.includes('Belum ada')) {
            friendsList.innerHTML = '<p style="padding: 20px; text-align: center; color: #888; font-size: 13px;">Belum ada teman.</p>';
        }
        return;
    }

    const friendIds = friendships.map(f => f.friend_id);
    const { data: friendsProfiles } = await supabaseClient.from('profiles').select('*').in('id', friendIds);
    if (!friendsProfiles) return;

    if (friendsList.innerHTML.includes('Belum ada')) {
        friendsList.innerHTML = '';
    }

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
                let cleanMsg = msg.message;
                if (cleanMsg.startsWith('[GAME_')) {
                    cleanMsg = '🎮 [Undangan / Sesi Permainan Tic-Tac-Toe]';
                }
                lastMsgText = prefix + cleanMsg;
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

async function openChatRoom(friendId, friendName, friendAvatar) {
    if (homeSubscription) supabaseClient.removeChannel(homeSubscription);

    activeFriendId = friendId;
    activeFriendName = friendName;
    activeFriendAvatar = friendAvatar;
    cancelReply();

    gameActive = false;
    if (gameModal) gameModal.classList.remove('active');

    chatMessages.innerHTML = '';
    messageCache = {};
    chatPartnerName.textContent = `@${friendName}`;
    renderAvatar(chatPartnerAvatarContainer, friendAvatar, friendName, '36px');
    chatStatusIndicator.textContent = '...';

    history.pushState({ screen: 'chat' }, '');
    homeScreen.classList.remove('active');
    chatScreen.classList.add('active');

    await Promise.all([
        checkPartnerIdStatus(friendId),
        loadMessages()
    ]);

    subscribePartnerStatus(friendId);
    await markMessagesAsRead();
    subscribeToRealtime();
    setupTypingIndicator();
}

async function checkPartnerIdStatus(friendId) {
    const { data } = await supabaseClient.from('profiles').select('is_online').eq('id', friendId).single();
    if (data) {
        chatStatusIndicator.textContent = data.is_online ? 'Online' : 'Offline';
        chatStatusIndicator.style.color = data.is_online ? '#28a745' : '#888';
    }
}

function subscribePartnerStatus(friendId) {
    if (profileStatusSubscription) supabaseClient.removeChannel(profileStatusSubscription);

    profileStatusSubscription = supabaseClient
        .channel(`live-status-${friendId}`)
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles', 
            filter: `id=eq.${friendId}` 
        }, payload => {
            if (payload && payload.new) {
                const isOnline = payload.new.is_online;
                if (chatStatusIndicator.textContent !== 'Sedang mengetik...') {
                    chatStatusIndicator.textContent = isOnline ? 'Online' : 'Offline';
                    chatStatusIndicator.style.color = isOnline ? '#28a745' : '#888';
                }
            }
        })
        .subscribe();
}

if (btnBack) {
    btnBack.addEventListener('click', () => {
        history.back();
    });
}

function closeChatRoomInternal(pushHistory = true) {
    if (chatSubscription) supabaseClient.removeChannel(chatSubscription);
    if (profileStatusSubscription) supabaseClient.removeChannel(profileStatusSubscription);
    if (typingChannel) supabaseClient.removeChannel(typingChannel);
    chatScreen.classList.remove('active');
    homeScreen.classList.add('active');
    activeFriendId = null;
    loadFriends();
    subscribeHomeRealtime();
    if (pushHistory) history.replaceState({ screen: 'home' }, '');
}

async function loadMessages() {
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

    let textToDisplay = msg.message;
    let isGameCard = false;

    if (textToDisplay && textToDisplay.startsWith('[GAME_INVITE]:')) {
        isGameCard = true;
        const isSender = msg.sender_id === currentUserId;
        textToDisplay = isSender 
            ? '🎮 [UNDANGAN GAME] Kamu menantang teman bermain Tic-Tac-Toe. Menunggu persetujuan (acc)...' 
            : '🎮 [UNDANGAN GAME] Teman mengajakmu bermain Tic-Tac-Toe!';
    } else if (textToDisplay && textToDisplay.startsWith('[GAME_START]:')) {
        isGameCard = true;
        textToDisplay = '🎮 [GAME DIMULAI] Tantangan diterima! Permainan Tic-Tac-Toe sedang berlangsung.';
    } else if (textToDisplay && textToDisplay.startsWith('[GAME_MOVE]:')) {
        textToDisplay = '🎮 [Langkah Permainan Tic-Tac-Toe]';
    }

    let wrapperEl = document.getElementById(`msg-wrap-${msg.id}`);
    const isOutgoing = msg.sender_id === currentUserId;
    const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let statusIcon = '';
    if (isOutgoing) {
        statusIcon = `<span class="msg-status ${msg.status === 'read' ? 'read' : ''}">${msg.status === 'read' ? '✓✓' : '✓'}</span>`;
    }

    let displayContent = escapeHtml(textToDisplay);
    if (msg.is_deleted_for_all) {
        displayContent = '<em style="color: #888;">Pesan ini telah dihapus</em>';
    }

    let actionButtonContainer = null;
    if (isGameCard && msg.message.startsWith('[GAME_INVITE]:') && !isOutgoing) {
        actionButtonContainer = document.createElement('div');
        actionButtonContainer.style.marginTop = '8px';
        
        const acceptBtn = document.createElement('button');
        acceptBtn.textContent = 'Terima (Acc) Undangan';
        acceptBtn.style.cssText = 'background: #000; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer;';
        
        acceptBtn.addEventListener('click', () => {
            acceptGameInvite(msg.id);
        });
        
        actionButtonContainer.appendChild(acceptBtn);
    }

    let replyHtml = '';
    if (!msg.is_deleted_for_all && msg.reply_to && messageCache[msg.reply_to]) {
        const repliedMsg = messageCache[msg.reply_to];
        let repText = repliedMsg.message;
        if (repText && repText.startsWith('[GAME_')) repText = '🎮 [Aktivitas Permainan]';
        const repliedSender = repliedMsg.sender_id === currentUserId ? 'Kamu' : `@${activeFriendName}`;
        replyHtml = `
            <div class="quoted-msg">
                <span class="quoted-sender">${repliedSender}</span>
                <span>${repliedMsg.is_deleted_for_all ? 'Pesan telah dihapus' : escapeHtml(repText)}</span>
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
        if (actionButtonContainer) {
            msgItem.appendChild(actionButtonContainer);
        }
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

    if (actionButtonContainer) {
        div.appendChild(actionButtonContainer);
    }

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

if (optCancel) {
    optCancel.addEventListener('click', () => { messageOptionsModal.classList.remove('active'); });
}

if (optReply) {
    optReply.addEventListener('click', () => {
        messageOptionsModal.classList.remove('active');
        const msg = selectedMessageForAction;
        const isOutgoing = msg.sender_id === currentUserId;
        triggerReply(msg.id, isOutgoing ? 'Kamu' : `@${activeFriendName}`, msg.message);
    });
}

if (optDeleteMe) {
    optDeleteMe.addEventListener('click', async () => {
        messageOptionsModal.classList.remove('active');
        const msg = selectedMessageForAction;
        const isSender = msg.sender_id === currentUserId;

        const updateField = isSender ? { deleted_for_sender: true } : { deleted_for_receiver: true };
        await supabaseClient.from('messages').update(updateField).eq('id', msg.id);

        const el = document.getElementById(`msg-wrap-${msg.id}`);
        if (el) el.remove();
    });
}

if (optDeleteAll) {
    optDeleteAll.addEventListener('click', async () => {
        messageOptionsModal.classList.remove('active');
        const msg = selectedMessageForAction;
        await supabaseClient.from('messages').update({ is_deleted_for_all: true, message: '' }).eq('id', msg.id);
    });
}

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

if (btnCancelReply) {
    btnCancelReply.addEventListener('click', cancelReply);
}

function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

async function sendMessage() {
    const currentInput = document.getElementById('message-input');
    const text = currentInput ? currentInput.value.trim() : '';
    if (!text) return;

    const replyId = replyingToMessageId;
    currentInput.value = '';
    cancelReply();

    if (typingChannel) {
        typingChannel.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: currentUserId, isTyping: false }
        });
    }

    await supabaseClient.from('messages').insert([{
        sender_id: currentUserId,
        receiver_id: activeFriendId,
        message: text,
        status: 'sent',
        reply_to: replyId || null
    }]);
}

if (btnSend) {
    btnSend.addEventListener('click', sendMessage);
}

// --- FITUR TYPING INDICATOR & HANDLING INPUT CHAT ---
function setupTypingIndicator() {
    if (typingChannel) supabaseClient.removeChannel(typingChannel);

    const sortedIds = [currentUserId, activeFriendId].sort().join('-');

    typingChannel = supabaseClient.channel(`typing-${sortedIds}`, {
        config: { broadcast: { self: false } }
    });

    typingChannel
        .on('broadcast', { event: 'typing' }, payload => {
            if (payload && payload.payload) {
                const { userId, isTyping } = payload.payload;
                if (userId === activeFriendId) {
                    if (isTyping) {
                        chatStatusIndicator.textContent = 'Sedang mengetik...';
                        chatStatusIndicator.style.color = '#28a745';
                    } else {
                        checkPartnerIdStatus(activeFriendId);
                    }
                }
            }
        })
        .subscribe();

    const activeMsgInput = document.getElementById('message-input');
    if (activeMsgInput) {
        // Bersihkan event listener sebelumnya dengan clone node
        const newMsgInput = activeMsgInput.cloneNode(true);
        activeMsgInput.parentNode.replaceChild(newMsgInput, activeMsgInput);
        
        const freshInput = document.getElementById('message-input');
        
        freshInput.addEventListener('keypress', (e) => { 
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });

        freshInput.addEventListener('input', () => {
            if (!typingChannel) return;

            typingChannel.send({
                type: 'broadcast',
                event: 'typing',
                payload: { userId: currentUserId, isTyping: true }
            });

            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                typingChannel.send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: { userId: currentUserId, isTyping: false }
                });
            }, 2000);
        });
    }
}

// --- LOGIKA MINI GAME TIC-TAC-TOE ---
if (btnInviteGame) {
    btnInviteGame.addEventListener('click', async () => {
        await supabaseClient.from('messages').insert([{
            sender_id: currentUserId,
            receiver_id: activeFriendId,
            message: `[GAME_INVITE]:${currentUserId}`,
            status: 'sent'
        }]);
        alert('Undangan game telah dikirim ke temanmu. Menunggu persetujuan (acc)...');
    });
}

if (btnCloseGame) {
    btnCloseGame.addEventListener('click', () => {
        gameModal.classList.remove('active');
        gameActive = false;
    });
}

async function acceptGameInvite(inviteMsgId) {
    const randomChoice = Math.random() < 0.5;
    const hostSymbol = randomChoice ? 'X' : 'O';
    const guestSymbol = hostSymbol === 'X' ? 'O' : 'X';

    const gameConfig = {
        hostId: currentUserId,
        symbols: {
            [activeFriendId]: hostSymbol,
            [currentUserId]: guestSymbol
        },
        usernames: {
            [activeFriendId]: activeFriendName,
            [currentUserId]: currentUsername
        },
        turn: 'X'
    };

    await supabaseClient.from('messages').insert([{
        sender_id: currentUserId,
        receiver_id: activeFriendId,
        message: `[GAME_START]:${JSON.stringify(gameConfig)}`,
        status: 'sent'
    }]);

    initGameSession(gameConfig);
}

function initGameSession(config) {
    gameState = ['', '', '', '', '', '', '', '', ''];
    activeGameSymbolsMap = config.symbols;
    
    mySymbol = config.symbols[currentUserId];
    opponentSymbol = mySymbol === 'X' ? 'O' : 'X';
    isMyTurn = (config.turn === mySymbol);
    gameActive = true;
    updateBoardUI();
    gameModal.classList.add('active');
}

function updateBoardUI() {
    gameCells.forEach((cell, index) => {
        cell.textContent = gameState[index];
    });
    if (gameActive) {
        gameStatusText.textContent = isMyTurn ? `Giliran Kamu (${mySymbol})` : `Giliran Lawan (${opponentSymbol})`;
    }
}

gameCells.forEach(cell => {
    cell.addEventListener('click', async () => {
        const index = cell.getAttribute('data-index');
        
        if (!gameActive || !isMyTurn || gameState[index] !== '') {
            return;
        }

        gameState[index] = mySymbol;
        isMyTurn = false;
        updateBoardUI();
        
        const winResult = checkGameWinnerLocal();

        await supabaseClient.from('messages').insert([{
            sender_id: currentUserId,
            receiver_id: activeFriendId,
            message: `[GAME_MOVE]:${JSON.stringify({ index, symbol: mySymbol, state: gameState, winner: winResult, winnerId: winResult ? currentUserId : null })}`,
            status: 'sent'
        }]);
    });
});

function checkGameWinnerLocal() {
    const winningConditions = [
        [0,1,2], [3,4,5], [6,7,8], 
        [0,3,6], [1,4,7], [2,5,8], 
        [0,4,8], [2,4,6]           
    ];

    for (let condition of winningConditions) {
        let a = gameState[condition[0]];
        let b = gameState[condition[1]];
        let c = gameState[condition[2]];
        if (a !== '' && a === b && b === c) {
            gameActive = false;
            gameStatusText.textContent = `🎉 Permainan Selesai! Pemenang: @${currentUsername}`;
            
            setTimeout(() => {
                if (gameModal.classList.contains('active')) {
                    gameModal.classList.remove('active');
                }
            }, 3000);

            return a;
        }
    }

    if (!gameState.includes('')) {
        gameActive = false;
        gameStatusText.textContent = `🤝 Permainan Berakhir Seri!`;
        
        setTimeout(() => {
            if (gameModal.classList.contains('active')) {
                gameModal.classList.remove('active');
            }
        }, 3000);

        return 'tie';
    }
    return null;
}

function handleIncomingGameMessage(msg) {
    try {
        const text = msg.message;
        if (text.startsWith('[GAME_START]:')) {
            const configData = JSON.parse(text.replace('[GAME_START]:', ''));
            initGameSession(configData);
        } else if (text.startsWith('[GAME_MOVE]:')) {
            const moveData = JSON.parse(text.replace('[GAME_MOVE]:', ''));
            gameState = moveData.state;
            
            if (moveData.winner) {
                gameActive = false;
                updateBoardUI();
                if (moveData.winner === 'tie') {
                    gameStatusText.textContent = `🤝 Permainan Berakhir Seri!`;
                } else {
                    let winnerName = 'Lawan';
                    if (moveData.winnerId && moveData.winnerId === currentUserId) {
                        winnerName = `@${currentUsername}`;
                    } else if (moveData.winnerId && moveData.winnerId === activeFriendId) {
                        winnerName = `@${activeFriendName}`;
                    } else {
                        const winnerSymbol = moveData.winner;
                        const winnerId = Object.keys(activeGameSymbolsMap).find(id => activeGameSymbolsMap[id] === winnerSymbol);
                        winnerName = (winnerId === currentUserId) ? `@${currentUsername}` : `@${activeFriendName}`;
                    }
                    gameStatusText.textContent = `🎉 Permainan Selesai! Pemenang: ${winnerName}`;
                }

                setTimeout(() => {
                    if (gameModal.classList.contains('active')) {
                        gameModal.classList.remove('active');
                    }
                }, 3000);

            } else {
                if (moveData.symbol !== mySymbol) {
                    isMyTurn = true;
                } else {
                    isMyTurn = false;
                }
                updateBoardUI();
            }
        }
    } catch(e) {
        console.error("Gagal memproses pesan game", e);
    }
}

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
                    if (msg.message && msg.message.startsWith('[GAME_')) {
                        handleIncomingGameMessage(msg);
                    }

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
            if (homeScreen.classList.contains('active')) loadFriends();
        })
        .subscribe();
}

document.addEventListener("visibilitychange", async () => {
    if (!currentUserId) return;

    if (document.visibilityState === "visible") {
        await supabaseClient.from('profiles').update({ is_online: true }).eq('id', currentUserId);
        
        if (chatScreen && chatScreen.classList.contains('active') && activeFriendId) {
            await loadMessages();
            await markMessagesAsRead();
            subscribeToRealtime();
        } else if (homeScreen.classList.contains('active')) {
            loadFriends();
            subscribeHomeRealtime();
        }
    } else {
        await supabaseClient.from('profiles').update({ is_online: false }).eq('id', currentUserId);
    }
});

window.addEventListener('beforeunload', () => {
    if (currentUserId) {
        supabaseClient.from('profiles').update({ is_online: false }).eq('id', currentUserId);
    }
});

function saveLocalStorage() {
    localStorage.setItem('chat_user_id', currentUserId);
    localStorage.setItem('chat_username', currentUsername);
    if (currentUserAvatar) localStorage.setItem('chat_avatar', currentUserAvatar);
}

function clearLocalStorage() {
    if (currentUserId) {
        supabaseClient.from('profiles').update({ is_online: false }).eq('id', currentUserId);
    }
    localStorage.removeItem('chat_user_id');
    localStorage.removeItem('chat_username');
    localStorage.removeItem('chat_avatar');
    currentUserId = null;
    currentUsername = null;
    currentUserAvatar = null;
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        clearLocalStorage();
        location.reload();
    });
}