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

// Elemen Plus (+) Menu Pop-up
const btnToggleChatPlus = document.getElementById('btn-toggle-chat-plus');
const chatPlusPopup = document.getElementById('chat-plus-popup');

// --- ELEMEN & VARIABLE WEBRTC (PEERJS ENGINE) ---
const btnStartAudioCall = document.getElementById('btn-start-audio-call');
const btnStartVideoCall = document.getElementById('btn-start-video-call');
const webrtcCallModal = document.getElementById('webrtc-call-modal');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const callTargetName = document.getElementById('call-target-name');
const callStatusText = document.getElementById('call-status-text');
const btnEndWebRTCCall = document.getElementById('btn-end-webrtc-call');
const btnToggleMic = document.getElementById('btn-toggle-mic');
const btnToggleCam = document.getElementById('btn-toggle-cam');

let peer = null;
let currentCall = null;
let localStream = null;
let incomingCallObject = null;

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
            initPeerJS();
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
    if (musicModal) musicModal.classList.remove('active');
    if (musicAdminModal) musicAdminModal.classList.remove('active');
    endWebRTCCall();

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
    initPeerJS();
    showHomeScreen(true);
});

// --- INISIALISASI ENGINE PEERJS DENGAN TURN RELAY SERVER ---
function initPeerJS() {
    if (!currentUserId) return;
    if (peer) peer.destroy();

    const peerId = `textinaja-peer-${currentUserId.replace(/-/g, '')}`;

    peer = new Peer(peerId, {
        debug: 1,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' },
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelay',
                    credential: 'openrelay'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelay',
                    credential: 'openrelay'
                }
            ]
        }
    });

    peer.on('open', (id) => {
        console.log('PeerJS Server Siap! ID Saya:', id);
    });

    peer.on('call', async (call) => {
        incomingCallObject = call;
        const isVideoCall = call.metadata && call.metadata.isVideo;

        callTargetName.textContent = `@${activeFriendName || 'Teman'}`;
        callStatusText.textContent = 'Panggilan Masuk...';
        showWebRTCUI(isVideoCall);

        window.acceptPeerCall = async () => {
            try {
                localStream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: isVideoCall ? { facingMode: 'user' } : false
                });

                localVideo.srcObject = localStream;
                localVideo.style.display = isVideoCall ? 'block' : 'none';

                call.answer(localStream);
                currentCall = call;

                call.on('stream', (remoteStream) => {
                    remoteVideo.srcObject = remoteStream;
                    callStatusText.textContent = 'Terhubung!';
                });

                call.on('close', () => { endWebRTCCall(false); });
                call.on('error', () => { endWebRTCCall(false); });
            } catch (err) {
                alert('Gagal mengakses Kamera/Mikrofon.');
                endWebRTCCall(true);
            }
        };
    });

    peer.on('error', (err) => {
        console.error("PeerJS Error:", err);
    });
}

// --- TOMBOL MANUAL IZIN NOTIFIKASI DI PROFIL ---
const btnRequestNotif = document.getElementById('btn-request-notif');
if (btnRequestNotif) {
    btnRequestNotif.addEventListener('click', async () => {
        if (!('Notification' in window)) {
            alert('Browser kamu tidak mendukung fitur notifikasi.');
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            alert('Berhasil! Izin notifikasi telah diaktifkan.');
            new Notification('Textinaja', {
                body: 'Notifikasi berhasil diaktifkan dan siap digunakan!',
                icon: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png'
            });
        } else if (permission === 'denied') {
            alert('Izin notifikasi diblokir oleh browser.');
        } else {
            alert('Permintaan izin notifikasi ditutup atau diabaikan.');
        }
    });
}

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
            friendsList.innerHTML = '<p style="padding: 24px; text-align: center; color: #888; font-size: 13px; animation: fadeIn 0.3s ease;">Belum ada teman.</p>';
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
                if (cleanMsg.startsWith('[GAME_')) cleanMsg = '🎮 [Sesi Game]';
                else if (cleanMsg.startsWith('[CALL_INVITE]')) cleanMsg = '📞 [Panggilan Suara/Video]';
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
    endWebRTCCall();

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

function showBrowserNotification(senderName, messageText) {
    if ('Notification' in window && Notification.permission === 'granted') {
        let cleanText = messageText;
        if (cleanText && cleanText.startsWith('[GAME_')) cleanText = 'Aktivitas game';
        else if (cleanText && cleanText.startsWith('[CALL_INVITE]')) cleanText = 'Panggilan masuk';

        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(`Pesan dari @${senderName}`, {
                    body: cleanText,
                    icon: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png',
                    badge: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png',
                    vibrate: [200, 100, 200],
                    tag: 'chat-notification',
                    renotify: true
                });
            }).catch(() => {
                new Notification(`Pesan dari @${senderName}`, { body: cleanText });
            });
        } else {
            new Notification(`Pesan dari @${senderName}`, { body: cleanText });
        }
    }
}

function appendMessage(msg) {
    messageCache[msg.id] = msg;
    if (msg.sender_id === currentUserId && msg.deleted_for_sender) return;
    if (msg.receiver_id === currentUserId && msg.deleted_for_receiver) return;

    let textToDisplay = msg.message;
    let isCallCard = false;
    let isGameCard = false;

    if (textToDisplay && textToDisplay.startsWith('[CALL_INVITE]:')) {
        isCallCard = true;
        const callType = textToDisplay.includes(':video') ? 'Video Call' : 'Panggilan Suara';
        const isSender = msg.sender_id === currentUserId;
        textToDisplay = isSender 
            ? `📞 [${callType}] Memanggil...` 
            : `📞 [${callType}] Memanggil kamu...`;
    } else if (textToDisplay && textToDisplay.startsWith('[GAME_INVITE]:')) {
        isGameCard = true;
        const isSender = msg.sender_id === currentUserId;
        textToDisplay = isSender 
            ? '🎮 [UNDANGAN GAME] Kamu menantang teman bermain Tic-Tac-Toe.' 
            : '🎮 [UNDANGAN GAME] Teman mengajakmu bermain Tic-Tac-Toe!';
    } else if (textToDisplay && textToDisplay.startsWith('[GAME_START]:')) {
        isGameCard = true;
        textToDisplay = '🎮 [GAME DIMULAI] Permainan Tic-Tac-Toe sedang berlangsung.';
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
    
    if (isCallCard && !isOutgoing && !msg.is_deleted_for_all) {
        actionButtonContainer = document.createElement('div');
        actionButtonContainer.style.marginTop = '8px';
        
        const joinCallBtn = document.createElement('button');
        joinCallBtn.textContent = 'Angkat Panggilan';
        joinCallBtn.style.cssText = 'background: #28a745; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer;';
        
        joinCallBtn.addEventListener('click', () => {
            if (window.acceptPeerCall) {
                window.acceptPeerCall();
            }
        });
        
        actionButtonContainer.appendChild(joinCallBtn);
    }

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
        else if (repText && repText.startsWith('[CALL_INVITE]')) repText = '📞 [Panggilan]';
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
    currentInput.style.height = 'auto';
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

// --- LOGIKA PANGGILAN TELEPON (PEERJS ENGINE) ---
function showWebRTCUI(isVideo) {
    callTargetName.textContent = `@${activeFriendName}`;
    callStatusText.textContent = 'Menghubungkan...';
    webrtcCallModal.classList.add('active');
    btnToggleCam.style.display = isVideo ? 'block' : 'none';
}

async function startWebRTCCall(isVideo = false) {
    if (!activeFriendId) return;
    showWebRTCUI(isVideo);

    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: isVideo ? { facingMode: 'user' } : false
        });

        localVideo.srcObject = localStream;
        localVideo.style.display = isVideo ? 'block' : 'none';

        const friendPeerId = `textinaja-peer-${activeFriendId.replace(/-/g, '')}`;
        currentCall = peer.call(friendPeerId, localStream, {
            metadata: { isVideo }
        });

        currentCall.on('stream', (remoteStream) => {
            remoteVideo.srcObject = remoteStream;
            callStatusText.textContent = 'Terhubung!';
        });

        currentCall.on('close', () => { endWebRTCCall(false); });
        currentCall.on('error', () => { endWebRTCCall(false); });

        await supabaseClient.from('messages').insert([{
            sender_id: currentUserId,
            receiver_id: activeFriendId,
            message: `[CALL_INVITE]:${isVideo ? 'video' : 'audio'}`,
            status: 'sent'
        }]);
    } catch (err) {
        console.error("Gagal memulai panggilan:", err);
        alert('Gagal mengakses Kamera/Mikrofon. Pastikan izin telah diberikan.');
        endWebRTCCall(false);
    }
}

function endWebRTCCall(notifyPeer = true) {
    if (currentCall) {
        currentCall.close();
        currentCall = null;
    }

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    if (localVideo) localVideo.srcObject = null;
    if (remoteVideo) remoteVideo.srcObject = null;

    webrtcCallModal.classList.remove('active');
}

if (btnStartAudioCall) btnStartAudioCall.addEventListener('click', () => startWebRTCCall(false));
if (btnStartVideoCall) btnStartVideoCall.addEventListener('click', () => startWebRTCCall(true));
if (btnEndWebRTCCall) btnEndWebRTCCall.addEventListener('click', () => endWebRTCCall(true));

if (btnToggleMic) {
    btnToggleMic.addEventListener('click', () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                btnToggleMic.style.background = audioTrack.enabled ? '#333' : '#dc3545';
            }
        }
    });
}

if (btnToggleCam) {
    btnToggleCam.addEventListener('click', () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                btnToggleCam.style.background = videoTrack.enabled ? '#333' : '#dc3545';
            }
        }
    });
}

// --- LOGIKA TOGGLE MENU TAMBAHAN (+) DI OBROLAN ---
if (btnToggleChatPlus) {
    btnToggleChatPlus.addEventListener('click', (e) => {
        e.stopPropagation();
        btnToggleChatPlus.classList.toggle('active');
        chatPlusPopup.classList.toggle('active');
    });
}

document.addEventListener('click', (e) => {
    if (chatPlusPopup && chatPlusPopup.classList.contains('active')) {
        if (!chatPlusPopup.contains(e.target) && e.target !== btnToggleChatPlus) {
            btnToggleChatPlus.classList.remove('active');
            chatPlusPopup.classList.remove('active');
        }
    }
});

// --- FITUR TYPING INDICATOR & TEXTAREA AUTO-RESIZE ---
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
        const newMsgInput = activeMsgInput.cloneNode(true);
        activeMsgInput.parentNode.replaceChild(newMsgInput, activeMsgInput);
        
        const freshInput = document.getElementById('message-input');
        
        freshInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        freshInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';

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
        if (btnToggleChatPlus) btnToggleChatPlus.classList.remove('active');
        if (chatPlusPopup) chatPlusPopup.classList.remove('active');

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

// --- LOGIKA PEMUTAR MUSIK ---
const ADMIN_PASSWORD = "admin123";

const PIXEL_COVERS = {
    vinyl: `<svg width="110" height="110" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#0d0d0d"/><circle cx="12" cy="12" r="8" fill="#1f1f1f"/><circle cx="12" cy="12" r="4" fill="#1db954"/><circle cx="12" cy="12" r="1.5" fill="#fff"/></svg>`,
    tape: `<svg width="110" height="110" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" fill="#2d3748"/><rect x="4" y="7" width="16" height="6" rx="1" fill="#e2e8f0"/><circle cx="8" cy="10" r="2" fill="#1a202c"/><circle cx="16" cy="10" r="2" fill="#1a202c"/></svg>`,
    gameboy: `<svg width="110" height="110" viewBox="0 0 24 24"><rect x="3" y="2" width="18" height="20" rx="3" fill="#6d28d9"/><rect x="5" y="4" width="14" height="9" fill="#6ee7b7"/><circle cx="16" cy="16" r="1.5" fill="#ef4444"/><circle cx="13" cy="18" r="1.5" fill="#ef4444"/></svg>`,
    headphone: `<svg width="110" height="110" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 18 0v7h-5v-7h5A7 7 0 0 0 3 12z" fill="#0369a1"/><rect x="1" y="12" width="5" height="8" rx="2" fill="#f8fafc"/><rect x="18" y="12" width="5" height="8" rx="2" fill="#f8fafc"/></svg>`
};

const btnOpenMusic = document.getElementById('btn-open-music');
const musicModal = document.getElementById('music-modal');
const btnCloseMusic = document.getElementById('btn-close-music');
const btnPlayPause = document.getElementById('btn-play-pause');
const svgIconPlay = document.getElementById('svg-icon-play');
const svgIconPause = document.getElementById('svg-icon-pause');
const btnPrevSong = document.getElementById('btn-prev-song');
const btnNextSong = document.getElementById('btn-next-song');
const songTitleEl = document.getElementById('song-title');
const songArtistEl = document.getElementById('song-artist');
const songProgress = document.getElementById('song-progress');
const currentTimeEl = document.getElementById('current-time');
const totalDurationEl = document.getElementById('total-duration');
const playlistContainer = document.getElementById('playlist-container');
const musicWaves = document.getElementById('music-waves');
const pixelSvgContainer = document.getElementById('pixel-svg-container');

const musicSlider = document.getElementById('music-slider');
const musicSliderWrapper = document.getElementById('music-slider-wrapper');
const dotPlaylist = document.getElementById('dot-playlist');
const dotPlayer = document.getElementById('dot-player');
const musicModalTitle = document.getElementById('music-modal-title');

const btnOpenAdminMusic = document.getElementById('btn-open-admin-music');
const musicAdminModal = document.getElementById('music-admin-modal');
const btnCloseAdminMusic = document.getElementById('btn-close-admin-music');
const adminAuthSection = document.getElementById('admin-auth-section');
const adminPanelSection = document.getElementById('admin-panel-section');
const adminPassInput = document.getElementById('admin-pass-input');
const btnVerifyAdmin = document.getElementById('btn-verify-admin');

const addSongTitle = document.getElementById('add-song-title');
const addSongArtist = document.getElementById('add-song-artist');
const adminAudioInput = document.getElementById('admin-audio-input');
const btnSaveNewSong = document.getElementById('btn-save-new-song');
const adminDeleteList = document.getElementById('admin-delete-list');
const pixelCoverOptions = document.querySelectorAll('.pixel-cover-option');

let selectedPixelCover = 'vinyl';
let playlist = [];
let currentSongIndex = -1;
let audioElement = new Audio();
let isPlayingMusic = false;
let isAdminAuthenticated = false;

let currentSlideIndex = 1;

function goToSlide(index) {
    currentSlideIndex = index;
    if (index === 0) {
        musicSlider.style.transform = 'translateX(0%)';
        dotPlaylist.classList.add('active');
        dotPlayer.classList.remove('active');
        musicModalTitle.textContent = "Daftar Musik";
    } else {
        musicSlider.style.transform = 'translateX(-50%)';
        dotPlayer.classList.add('active');
        dotPlaylist.classList.remove('active');
        musicModalTitle.textContent = "Mini Music";
    }
}

if (dotPlaylist) dotPlaylist.addEventListener('click', () => goToSlide(0));
if (dotPlayer) dotPlayer.addEventListener('click', () => goToSlide(1));

let touchStartX = 0;
let touchEndX = 0;

if (musicSliderWrapper) {
    musicSliderWrapper.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    musicSliderWrapper.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);
}

function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX - touchStartX > swipeThreshold) {
        goToSlide(0);
    } else if (touchStartX - touchEndX > swipeThreshold) {
        goToSlide(1);
    }
}

pixelCoverOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        pixelCoverOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedPixelCover = opt.getAttribute('data-style');
    });
});

async function fetchPublicPlaylist() {
    const { data: songs, error } = await supabaseClient
        .from('songs')
        .select('*')
        .order('created_at', { ascending: true });

    if (!error && songs) {
        playlist = songs;
        renderPlaylistUI();
        if (currentSongIndex === -1 && playlist.length > 0) {
            loadSong(0, false);
        }
    }
}

fetchPublicPlaylist();

supabaseClient
    .channel('public:songs')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, () => {
        fetchPublicPlaylist();
    })
    .subscribe();

if (btnOpenMusic) {
    btnOpenMusic.addEventListener('click', () => {
        if (btnToggleChatPlus) btnToggleChatPlus.classList.remove('active');
        if (chatPlusPopup) chatPlusPopup.classList.remove('active');

        musicModal.classList.add('active');
        goToSlide(1);
        fetchPublicPlaylist();
    });
}

if (btnCloseMusic) {
    btnCloseMusic.addEventListener('click', () => {
        musicModal.classList.remove('active');
    });
}

if (btnOpenAdminMusic) {
    btnOpenAdminMusic.addEventListener('click', (e) => {
        e.stopPropagation();
        musicAdminModal.classList.add('active');
        if (!isAdminAuthenticated) {
            adminAuthSection.style.display = 'block';
            adminPanelSection.style.display = 'none';
            adminPassInput.value = '';
        } else {
            showAdminPanel();
        }
    });
}

if (btnCloseAdminMusic) {
    btnCloseAdminMusic.addEventListener('click', () => {
        musicAdminModal.classList.remove('active');
    });
}

if (btnVerifyAdmin) {
    btnVerifyAdmin.addEventListener('click', () => {
        if (adminPassInput.value === ADMIN_PASSWORD) {
            isAdminAuthenticated = true;
            showAdminPanel();
        } else {
            alert('Password Admin Salah!');
        }
    });
}

function showAdminPanel() {
    adminAuthSection.style.display = 'none';
    adminPanelSection.style.display = 'block';
    renderAdminDeleteList();
}

if (btnSaveNewSong) {
    btnSaveNewSong.addEventListener('click', async () => {
        const title = addSongTitle.value.trim();
        const artist = addSongArtist.value.trim();
        const audioFile = adminAudioInput.files[0];

        if (!audioFile) {
            alert('Pilih file audio lagu terlebih dahulu!');
            return;
        }

        btnSaveNewSong.textContent = "Mengunggah...";
        btnSaveNewSong.disabled = true;

        try {
            const fileExt = audioFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('music')
                .upload(fileName, audioFile);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabaseClient.storage
                .from('music')
                .getPublicUrl(fileName);

            const audioUrl = publicUrlData.publicUrl;
            const songName = title || audioFile.name.replace(/\.[^/.]+$/, "");
            const artistName = artist || "Artis Tidak Diketahui";

            const { error: insertError } = await supabaseClient.from('songs').insert([{
                title: songName,
                artist: artistName,
                src: audioUrl,
                cover_style: selectedPixelCover
            }]);

            if (insertError) throw insertError;

            addSongTitle.value = '';
            addSongArtist.value = '';
            adminAudioInput.value = '';

            await fetchPublicPlaylist();
            renderAdminDeleteList();
            alert('Lagu berhasil diunggah ke database!');
        } catch(e) {
            alert('Gagal mengunggah lagu.');
            console.error(e);
        } finally {
            btnSaveNewSong.textContent = "Unggah ke Database";
            btnSaveNewSong.disabled = false;
        }
    });
}

function renderAdminDeleteList() {
    adminDeleteList.innerHTML = '';
    if (playlist.length === 0) {
        adminDeleteList.innerHTML = '<p style="font-size: 11px; color: #777; margin: 0;">Belum ada lagu.</p>';
        return;
    }

    playlist.forEach((song) => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #111; padding: 6px 8px; border-radius: 4px; font-size: 11px;';
        item.innerHTML = `
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">${song.title}</span>
            <button style="background: #dc3545; color: #fff; border: none; padding: 2px 6px; border-radius: 4px; font-size: 10px; cursor: pointer;">Hapus</button>
        `;
        item.querySelector('button').addEventListener('click', () => {
            deleteSongFromDB(song);
        });
        adminDeleteList.appendChild(item);
    });
}

async function deleteSongFromDB(song) {
    if (confirm(`Yakin ingin menghapus lagu "${song.title}"?`)) {
        try {
            const urlParts = song.src.split('/');
            const fileName = urlParts[urlParts.length - 1];

            if (fileName) {
                await supabaseClient.storage.from('music').remove([fileName]);
            }

            const { error } = await supabaseClient.from('songs').delete().eq('id', song.id);
            if (error) throw error;

            if (currentSongIndex >= 0 && playlist[currentSongIndex]?.id === song.id) {
                pauseMusic();
                audioElement.src = '';
                currentSongIndex = -1;
            }

            await fetchPublicPlaylist();
            renderAdminDeleteList();
            alert('Lagu berhasil dihapus permanen!');
        } catch (err) {
            console.error("Gagal menghapus lagu:", err);
            alert("Gagal menghapus lagu.");
        }
    }
}

function loadSong(index, autoPlay = true) {
    if (index < 0 || index >= playlist.length) return;
    currentSongIndex = index;
    const song = playlist[index];
    audioElement.src = song.src;
    songTitleEl.textContent = song.title;
    songArtistEl.textContent = song.artist;

    pixelSvgContainer.innerHTML = PIXEL_COVERS[song.cover_style] || PIXEL_COVERS['vinyl'];

    audioElement.load();
    renderPlaylistUI();
    if (autoPlay) playMusic();
}

function renderPlaylistUI() {
    playlistContainer.innerHTML = '';
    if (playlist.length === 0) {
        songTitleEl.textContent = "Belum Ada Lagu";
        songArtistEl.textContent = "Database masih kosong";
        pixelSvgContainer.innerHTML = PIXEL_COVERS['vinyl'];
        playlistContainer.innerHTML = '<p style="font-size: 11px; color: #666; text-align: center; margin: 8px 0;">Belum ada lagu dalam daftar musik.</p>';
        return;
    }

    playlist.forEach((song, idx) => {
        const item = document.createElement('div');
        item.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 8px; cursor: pointer; background: ${idx === currentSongIndex ? '#282828' : '#181818'}; border: 1px solid ${idx === currentSongIndex ? '#444' : 'transparent'}; transition: background 0.2s;`;
        item.innerHTML = `
            <div>
                <div style="font-size: 13px; font-weight: 600; color: ${idx === currentSongIndex ? '#ffffff' : '#ccc'};">${song.title}</div>
                <div style="font-size: 11px; color: #888; margin-top: 2px;">${song.artist}</div>
            </div>
            <span style="font-size: 11px; color: ${idx === currentSongIndex ? '#1db954' : '#aaa'}; font-weight: bold;">${idx === currentSongIndex && isPlayingMusic ? 'Playing' : '▶'}</span>
        `;
        item.addEventListener('click', () => {
            loadSong(idx, true);
            goToSlide(1);
        });
        playlistContainer.appendChild(item);
    });
}

function playMusic() {
    if (playlist.length === 0) {
        alert("Tidak ada lagu di database!");
        return;
    }
    if (currentSongIndex === -1 && playlist.length > 0) {
        loadSong(0, true);
        return;
    }
    
    audioElement.play().then(() => {
        isPlayingMusic = true;
        svgIconPlay.style.display = 'none';
        svgIconPause.style.display = 'block';
        musicWaves.style.opacity = '1';
        renderPlaylistUI();
    }).catch(err => {
        console.log("Autoplay diblokir", err);
    });
}

function pauseMusic() {
    audioElement.pause();
    isPlayingMusic = false;
    svgIconPlay.style.display = 'block';
    svgIconPause.style.display = 'none';
    musicWaves.style.opacity = '0';
    renderPlaylistUI();
}

if (btnPlayPause) {
    btnPlayPause.addEventListener('click', () => {
        if (isPlayingMusic) { pauseMusic(); } else { playMusic(); }
    });
}

if (btnNextSong) {
    btnNextSong.addEventListener('click', () => {
        if (playlist.length === 0) return;
        currentSongIndex = (currentSongIndex + 1) % playlist.length;
        loadSong(currentSongIndex, true);
    });
}

if (btnPrevSong) {
    btnPrevSong.addEventListener('click', () => {
        if (playlist.length === 0) return;
        currentSongIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
        loadSong(currentSongIndex, true);
    });
}

audioElement.addEventListener('timeupdate', () => {
    if (audioElement.duration) {
        const progressPercent = (audioElement.currentTime / audioElement.duration) * 100;
        songProgress.value = progressPercent;
        currentTimeEl.textContent = formatTime(audioElement.currentTime);
        totalDurationEl.textContent = formatTime(audioElement.duration);
    }
});

songProgress.addEventListener('input', () => {
    if (audioElement.duration) {
        audioElement.currentTime = (songProgress.value / 100) * audioElement.duration;
    }
});

audioElement.addEventListener('ended', () => {
    if (playlist.length === 0) return;
    currentSongIndex = (currentSongIndex + 1) % playlist.length;
    loadSong(currentSongIndex, true);
});

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
                        showBrowserNotification(activeFriendName, msg.message);
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
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` }, (payload) => {
            if (homeScreen.classList.contains('active')) loadFriends();
            if (payload && payload.new && payload.new.sender_id !== activeFriendId) {
                showBrowserNotification('Teman', payload.new.message);
            }
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