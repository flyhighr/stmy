let player;
let currentSong = 0;
let progressInterval;
let playlist;
let isPlayerReady = false;
let touchStartX = 0;
let touchEndX = 0;
let activeMessages = new Set();
let messageCheckInterval;
let originalPlaylist = [];
let shuffledPlaylist = [];
let isShuffled = false;
let repeatMode = 'none'; // 'none', 'all', 'one'
let volume = 100;
let isVolumeSliderVisible = false;

// Theme handling
const themeButtons = document.querySelectorAll('.theme-btn');
themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        document.body.dataset.theme = btn.dataset.theme;
        themeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Save theme preference
        localStorage.setItem('preferredTheme', btn.dataset.theme);
    });
});

// Load saved theme preference
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('preferredTheme');
    if (savedTheme) {
        document.body.dataset.theme = savedTheme;
        themeButtons.forEach(btn => {
            if (btn.dataset.theme === savedTheme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}

function initializeYouTubePlayer() {
    if (!playlist || !playlist.songs || !playlist.songs.length) return;
    
    const videoId = extractVideoId(playlist.songs[0].youtube_url);
    player = new YT.Player('youtube-player', {
        height: '0',
        width: '0',
        videoId: videoId,
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'disablekb': 1,
            'origin': window.location.origin
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerError(event) {
    showNotification("Error playing this song. Skipping to next...");
    setTimeout(() => {
        nextSong();
    }, 2000);
}

async function fetchPlaylist() {
    const customUrl = getCustomUrl();
    if (!customUrl) {
        window.location.href = '/notfound.html';
        return;
    }

    try {
        const response = await fetch(`https://ptrmoy.onrender.com/api/playlists/${customUrl}`);
        if (!response.ok) throw new Error('Playlist not found');
        
        playlist = await response.json();
        originalPlaylist = [...playlist.songs];
        shuffledPlaylist = [...originalPlaylist];
        
        localStorage.setItem('currentPlaylist', JSON.stringify({ url: customUrl, data: playlist }));
        history.replaceState({}, '', '/' + customUrl);
        
        initializeViewer();
        initializeYouTubePlayer();
        setupMessageContainer();
        setupShareOptions();
        initializePlaylistDrawer();
    } catch (error) {
        const storedPlaylist = localStorage.getItem('currentPlaylist');
        if (storedPlaylist) {
            const parsed = JSON.parse(storedPlaylist);
            if (parsed.url === customUrl) {
                playlist = parsed.data;
                originalPlaylist = [...playlist.songs];
                shuffledPlaylist = [...originalPlaylist];
                history.replaceState({}, '', '/' + customUrl);
                initializeViewer();
                initializeYouTubePlayer();
                setupMessageContainer();
                setupShareOptions();
                initializePlaylistDrawer();
                return;
            }
        }
        console.error('Error:', error);
        window.location.href = '/notfound.html';
    }
}

function setupMessageContainer() {
    if (!document.getElementById('timed-messages-container')) {
        const container = document.createElement('div');
        container.id = 'timed-messages-container';
        document.querySelector('.container').insertBefore(
            container,
            document.getElementById('song-info-container')
        );
    }
}

function setupShareOptions() {
    const shareUrl = window.location.href;
    
    // WhatsApp share
    const whatsappLink = document.getElementById('whatsapp-share');
    whatsappLink.href = `https://wa.me/?text=${encodeURIComponent(`Check out this playlist: ${shareUrl}`)}`;
    
    // Telegram share
    const telegramLink = document.getElementById('telegram-share');
    telegramLink.href = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Check out this playlist!')}`;
    
    // Copy link functionality
    const copyLinkButton = document.getElementById('copy-link');
    copyLinkButton.addEventListener('click', () => {
        navigator.clipboard.writeText(shareUrl)
            .then(() => {
                showNotification('Link copied to clipboard!');
                document.getElementById('share-modal').classList.remove('active');
            })
            .catch(err => {
                console.error('Could not copy text: ', err);
                showNotification('Failed to copy link. Please try again.');
            });
    });
}

function timeStringToSeconds(timeStr) {
    const [minutes, seconds] = timeStr.split(':').map(Number);
    return minutes * 60 + seconds;
}

function isImageUrl(str) {
    str = str.trim();
    const words = str.split(/\s+/);
    if (words.length > 1) return false;
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;
    try {
        const url = new URL(str);
        return imageExtensions.test(url.pathname);
    } catch {
        return false;
    }
}

function createMessageElement(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'timed-message';
    
    if (isImageUrl(message)) {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'message-image-container';
        const img = document.createElement('img');
        img.src = message;
        img.alt = 'Message Image';
        img.className = 'message-image';
        img.style.opacity = '0';
        img.onload = () => {
            img.style.opacity = '1';
        };
        
        imgContainer.appendChild(img);
        messageElement.appendChild(imgContainer);
    } else {
        messageElement.textContent = message;
    }
    
    return messageElement;
}

function checkTimedMessages() {
    if (!player || !player.getCurrentTime || !playlist.songs[currentSong].timed_messages) return;

    const currentTime = player.getCurrentTime();
    const messages = playlist.songs[currentSong].timed_messages.map(msg => ({
        ...msg,
        start_seconds: timeStringToSeconds(msg.start_time),
        end_seconds: msg.end_time ? timeStringToSeconds(msg.end_time) : null
    }));

    const messageContainer = document.getElementById('timed-messages-container');
    if (!messageContainer) return;

    messages.forEach(message => {
        const messageId = `message-${message.start_seconds}`;
        const shouldBeActive = currentTime >= message.start_seconds && 
            (!message.end_seconds || currentTime <= message.end_seconds);
        
        if (shouldBeActive && !activeMessages.has(messageId)) {
            const sanitizedMessage = message.message.replace(/<[^>]*>/g, '');
            const messageElement = createMessageElement(sanitizedMessage);
            messageElement.id = messageId;
            
            messageContainer.appendChild(messageElement);
            activeMessages.add(messageId);
        
            setTimeout(() => messageElement.classList.add('active'), 10);
            
            if (message.end_seconds) {
                const duration = (message.end_seconds - message.start_seconds) * 1000;
                setTimeout(() => {
                    removeMessage(messageId);
                }, duration);
            }
        } else if (!shouldBeActive && activeMessages.has(messageId)) {
            removeMessage(messageId);
        }
    });
}

function startMessageCheck() {
    clearInterval(messageCheckInterval);
    messageCheckInterval = setInterval(checkTimedMessages, 100);
}

function clearAllMessages() {
    const container = document.getElementById('timed-messages-container');
    if (container) {
        container.innerHTML = '';
        activeMessages.clear();
    }
}

function removeMessage(messageId) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
        messageElement.classList.remove('active');
        setTimeout(() => {
            messageElement.remove();
            activeMessages.delete(messageId);
        }, 500);
    }
}

function getCustomUrl() {
    const storedUrl = sessionStorage.getItem('customUrl');
    if (storedUrl) {
        return storedUrl;
    }
    const pathUrl = window.location.pathname.substring(1);
    if (pathUrl) {
        sessionStorage.setItem('customUrl', pathUrl);
        return pathUrl;
    }
    return null;
}

function initializeViewer() {
    if (!playlist) return;
        
    document.title = `${playlist.sender_name}'s Playlist`;
    document.querySelector('.welcome-title').textContent = `${playlist.sender_name} sent you a playlist`;
    document.querySelector('.welcome-text').textContent = playlist.welcome_message;
    document.querySelector('.header p').textContent = `Songs that remind ${playlist.sender_name} of you`;

    generateCards();
    generateSongInfo();
    updateCardClasses();
    initializeCardListeners();
}

function initializeCardListeners() {
    const cardsContainer = document.getElementById('cards-container');
    
    cardsContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });

    cardsContainer.addEventListener('touchmove', (e) => {
        touchEndX = e.touches[0].clientX;
        const diff = touchStartX - touchEndX;
        
        if ((currentSong === 0 && diff < 0) || 
            (currentSong === playlist.songs.length - 1 && diff > 0)) {
            return;
        }
        
        if (Math.abs(diff) > 5) {
            e.preventDefault();
        }
    }, { passive: false });

    cardsContainer.addEventListener('touchend', () => {
        const diff = touchStartX - touchEndX;
        const threshold = 50;

        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                nextSong();
            } else {
                prevSong();
            }
        }
    });

    document.querySelectorAll('.card').forEach((card, index) => {
        card.addEventListener('click', () => {
            if (index !== currentSong) {
                currentSong = index;
                const videoId = extractVideoId(playlist.songs[currentSong].youtube_url);
                player.loadVideoById(videoId);
                updateSongInfo();
                updatePlaylistDrawer();
            }
        });
    });
    
    // Card navigation buttons
    document.getElementById('card-prev').addEventListener('click', prevSong);
    document.getElementById('card-next').addEventListener('click', nextSong);
}

function generateCards() {
    const cardsContainer = document.getElementById('cards-container');
    cardsContainer.innerHTML = playlist.songs.map((song, index) => `
        <div class="card" id="song-${index + 1}">
            <img src="${song.cover_url}" alt="${song.title}" loading="lazy" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23cccccc\' stroke-width=\'1\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M9 18V5l12-2v13\'%3E%3C/path%3E%3Ccircle cx=\'6\' cy=\'18\' r=\'3\'%3E%3C/circle%3E%3Ccircle cx=\'18\' cy=\'16\' r=\'3\'%3E%3C/circle%3E%3C/svg%3E'">
        </div>
    `).join('');
}

function updateCardClasses() {
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.className = 'card';
        if (index === currentSong) {
            card.classList.add('active');
        } else if (index === (currentSong - 1 + playlist.songs.length) % playlist.songs.length) {
            card.classList.add('prev');
        } else if (index === (currentSong + 1) % playlist.songs.length) {
            card.classList.add('next');
        }
    });
}

function generateSongInfo() {
    const container = document.getElementById('song-info-container');
    container.innerHTML = playlist.songs.map((song, index) => `
        <div class="song-info${index === 0 ? ' active' : ''}" id="song-info-${index + 1}">
            <div class="title">${song.title}</div>
            <div class="artist">${song.artist}</div>
            <div class="progress-bar">
                <div class="progress"></div>
            </div>
            <div class="time-indicator">
                <span class="elapsed">0:00</span>
                <span class="remaining">0:00</span>
            </div>
        </div>
    `).join('');
}

function initializePlaylistDrawer() {
    const playlistItems = document.getElementById('playlist-items');
    const playlistCount = document.querySelector('.playlist-count');
    const playlistToggle = document.getElementById('playlist-toggle');
    const playlistDrawer = document.getElementById('playlist-drawer');
    
    // Set playlist count
    playlistCount.textContent = `${playlist.songs.length} songs`;
    
    // Generate playlist items
    playlistItems.innerHTML = playlist.songs.map((song, index) => `
        <div class="playlist-item${index === currentSong ? ' active' : ''}" data-index="${index}">
            <img src="${song.cover_url}" alt="${song.title}" class="playlist-item-img" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23cccccc\' stroke-width=\'1\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M9 18V5l12-2v13\'%3E%3C/path%3E%3Ccircle cx=\'6\' cy=\'18\' r=\'3\'%3E%3C/circle%3E%3Ccircle cx=\'18\' cy=\'16\' r=\'3\'%3E%3C/circle%3E%3C/svg%3E'">
            <div class="playlist-item-info">
                <div class="playlist-item-title">${song.title}</div>
                <div class="playlist-item-artist">${song.artist}</div>
            </div>
        </div>
    `).join('');
    
    // Add event listeners to playlist items
    document.querySelectorAll('.playlist-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            if (index !== currentSong) {
                currentSong = index;
                const videoId = extractVideoId(playlist.songs[currentSong].youtube_url);
                player.loadVideoById(videoId);
                updateSongInfo();
                updatePlaylistDrawer();
            }
        });
    });
    
    // Toggle playlist drawer
    playlistToggle.addEventListener('click', () => {
        playlistDrawer.classList.toggle('open');
        playlistToggle.classList.toggle('active');
        
        if (playlistDrawer.classList.contains('open')) {
            playlistToggle.querySelector('span').textContent = 'Hide Playlist';
        } else {
            playlistToggle.querySelector('span').textContent = 'Show Playlist';
        }
    });
}

function updatePlaylistDrawer() {
    const playlistItems = document.querySelectorAll('.playlist-item');
    playlistItems.forEach((item, index) => {
        if (index === currentSong) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function extractVideoId(url) {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function onPlayerReady(event) {
    isPlayerReady = true;
    const videoId = extractVideoId(playlist.songs[currentSong].youtube_url);
    player.loadVideoById(videoId);
    player.pauseVideo();
    player.setVolume(volume);
    updateSongInfo();
}

function onPlayerStateChange(event) {
    const pauseButton = document.getElementById('pause');
    const playIcon = pauseButton.querySelector('.play-icon');
    const pauseIcon = pauseButton.querySelector('.pause-icon');
    
    if (event.data == YT.PlayerState.ENDED) {
        handleSongEnd();
    } else if (event.data == YT.PlayerState.PLAYING) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        startProgress();
        startMessageCheck();
    } else if (event.data == YT.PlayerState.PAUSED) {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        clearInterval(progressInterval);
        clearInterval(messageCheckInterval);
    }
}

function handleSongEnd() {
    if (repeatMode === 'one') {
        // Repeat current song
        player.seekTo(0);
        player.playVideo();
    } else if (currentSong === playlist.songs.length - 1 && repeatMode === 'all') {
        // Last song and repeat all is on, go to first song
        currentSong = 0;
        const videoId = extractVideoId(playlist.songs[currentSong].youtube_url);
        player.loadVideoById(videoId);
        updateSongInfo();
        updatePlaylistDrawer();
    } else if (currentSong < playlist.songs.length - 1) {
        // Not the last song, go to next
        nextSong();
    } else {
        // Last song and no repeat, just stop
        const pauseButton = document.getElementById('pause');
        const playIcon = pauseButton.querySelector('.play-icon');
        const pauseIcon = pauseButton.querySelector('.pause-icon');
        
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        clearInterval(progressInterval);
        clearInterval(messageCheckInterval);
    }
}

function updateSongInfo() {
    document.querySelectorAll('.song-info').forEach(info => info.classList.remove('active'));
    document.getElementById(`song-info-${currentSong + 1}`).classList.add('active');
    updateCardClasses();
    updatePlaylistDrawer();
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function startProgress() {
    clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (player && player.getCurrentTime && player.getDuration) {
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();
            const progress = (currentTime / duration) * 100;
            
            const currentProgressBar = document.querySelector(`#song-info-${currentSong + 1} .progress`);
            if (currentProgressBar) {
                currentProgressBar.style.width = `${progress}%`;
            }
            
            const currentElapsed = document.querySelector(`#song-info-${currentSong + 1} .elapsed`);
            const currentRemaining = document.querySelector(`#song-info-${currentSong + 1} .remaining`);
            
            if (currentElapsed && currentRemaining) {
                currentElapsed.textContent = formatTime(currentTime);
                currentRemaining.textContent = formatTime(duration - currentTime);
            }
        }
    }, 100);
}

function togglePlay() {
    if (!isPlayerReady) return;
    
    const pauseButton = document.getElementById('pause');
    const playIcon = pauseButton.querySelector('.play-icon');
    const pauseIcon = pauseButton.querySelector('.pause-icon');
    
    if (player.getPlayerState() === YT.PlayerState.PLAYING) {
        player.pauseVideo();
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        clearInterval(progressInterval);
    } else {
        player.playVideo();
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        startProgress();
    }
}

function toggleShuffle() {
    if (!isPlayerReady) return;
    
    const shuffleButton = document.getElementById('shuffle');
    isShuffled = !isShuffled;
    
    if (isShuffled) {
        shuffleButton.classList.add('active');
        
        // Create a shuffled copy of the playlist
        const currentSongData = playlist.songs[currentSong];
        shuffledPlaylist = [...originalPlaylist].sort(() => Math.random() - 0.5);
        
        // Make sure current song stays in place
        const currentIndex = shuffledPlaylist.findIndex(song => 
            song.title === currentSongData.title && 
            song.artist === currentSongData.artist
        );
        
        if (currentIndex !== -1) {
            [shuffledPlaylist[0], shuffledPlaylist[currentIndex]] = [shuffledPlaylist[currentIndex], shuffledPlaylist[0]];
        }
        
        // Update playlist with shuffled order
        playlist.songs = shuffledPlaylist;
        
        // Reset current song index
        currentSong = 0;
        
        // Update UI
        generateCards();
        generateSongInfo();
        updateCardClasses();
        updateSongInfo();
        initializeCardListeners();
        initializePlaylistDrawer();
        
        showNotification('Shuffle enabled');
    } else {
        shuffleButton.classList.remove('active');
        
        // Restore original playlist order
        playlist.songs = [...originalPlaylist];
        
        // Find current song in original playlist
        const currentSongData = shuffledPlaylist[currentSong];
        currentSong = originalPlaylist.findIndex(song => 
            song.title === currentSongData.title && 
            song.artist === currentSongData.artist
        );
        
        if (currentSong === -1) currentSong = 0;
        
        // Update UI
        generateCards();
        generateSongInfo();
        updateCardClasses();
        updateSongInfo();
        initializeCardListeners();
        initializePlaylistDrawer();
        
        showNotification('Shuffle disabled');
    }
}

function toggleRepeat() {
    const repeatButton = document.getElementById('repeat');
    
    if (repeatMode === 'none') {
        repeatMode = 'all';
        repeatButton.classList.add('active');
        showNotification('Repeat all songs');
    } else if (repeatMode === 'all') {
        repeatMode = 'one';
        repeatButton.classList.add('active');
        repeatButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <path d="M12 19v-4"></path>
                <path d="M12 15h-3"></path>
            </svg>
        `;
        showNotification('Repeat current song');
    } else {
        repeatMode = 'none';
        repeatButton.classList.remove('active');
        repeatButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
        `;
        showNotification('Repeat disabled');
    }
}

function nextSong() {
    if (!isPlayerReady) return;
    
    clearInterval(progressInterval);
    clearInterval(messageCheckInterval);
    clearAllMessages();
    
    if (currentSong < playlist.songs.length - 1) {
        currentSong++;
    } else if (repeatMode === 'all') {
        currentSong = 0;
    } else {
        return;
    }
    
    const videoId = extractVideoId(playlist.songs[currentSong].youtube_url);
    player.loadVideoById(videoId);
    updateSongInfo();
}

function prevSong() {
    if (!isPlayerReady) return;
    
    clearInterval(progressInterval);
    clearInterval(messageCheckInterval);
    clearAllMessages();
    
    // If current time is more than 3 seconds, restart the song instead of going to previous
    if (player.getCurrentTime() > 3) {
        player.seekTo(0);
        return;
    }
    
    if (currentSong > 0) {
        currentSong--;
    } else if (repeatMode === 'all') {
        currentSong = playlist.songs.length - 1;
    } else {
        return;
    }
    
    const videoId = extractVideoId(playlist.songs[currentSong].youtube_url);
    player.loadVideoById(videoId);
    updateSongInfo();
}

function toggleVolume() {
    const volumeSliderContainer = document.getElementById('volume-slider-container');
    isVolumeSliderVisible = !isVolumeSliderVisible;
    
    if (isVolumeSliderVisible) {
        volumeSliderContainer.classList.add('active');
    } else {
        volumeSliderContainer.classList.remove('active');
    }
}

function setVolume(value) {
    volume = value;
    if (isPlayerReady && player) {
        player.setVolume(volume);
    }
    
    // Update volume button icon based on level
    const volumeBtn = document.getElementById('volume-btn');
    
    if (volume === 0) {
        volumeBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
        `;
    } else if (volume < 50) {
        volumeBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
        `;
    } else {
        volumeBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
        `;
    }
}

function showBrowserNotice() {
    const popup = document.createElement('div');
    popup.className = 'browser-popup';
    popup.innerHTML = `
        <div class="popup-content">
            <p>For the best experience:</p>
            <ol>
                <li>Tap the three dots (⋮) in the top right</li>
                <li>Select "Open in browser"</li>
            </ol>
            <button id="continue-anyway-btn">Continue Anyway</button>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById('continue-anyway-btn').addEventListener('click', () => {
        popup.remove();
    });
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    
    notificationMessage.textContent = message;
    notification.classList.add('active');
    
    setTimeout(() => {
        notification.classList.remove('active');
    }, 3000);
}

function toggleFavorite() {
    const favoriteButton = document.getElementById('favorite');
    favoriteButton.classList.toggle('favorited');
    
    if (favoriteButton.classList.contains('favorited')) {
        showNotification('Added to favorites');
        
        // Save favorite in localStorage
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        const customUrl = getCustomUrl();
        
        if (!favorites.includes(customUrl)) {
            favorites.push(customUrl);
            localStorage.setItem('favorites', JSON.stringify(favorites));
        }
    } else {
        showNotification('Removed from favorites');
        
        // Remove from favorites in localStorage
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        const customUrl = getCustomUrl();
        const index = favorites.indexOf(customUrl);
        
        if (index !== -1) {
            favorites.splice(index, 1);
            localStorage.setItem('favorites', JSON.stringify(favorites));
        }
    }
}

function checkIfFavorited() {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const customUrl = getCustomUrl();
    
    if (favorites.includes(customUrl)) {
        const favoriteButton = document.getElementById('favorite');
        favoriteButton.classList.add('favorited');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Load saved theme
    loadSavedTheme();
    
    // Check if viewing in Instagram browser
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (userAgent.indexOf('Instagram') > -1) {
        showBrowserNotice();
    }
    
    fetchPlaylist();
    
    // Initialize event listeners
    const pauseButton = document.getElementById('pause');
    const prevButton = document.getElementById('prev');
    const nextButton = document.getElementById('next');
    const favoriteButton = document.getElementById('favorite');
    const fullscreenButton = document.getElementById('fullscreen-btn');
    const volumeButton = document.getElementById('volume-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const shuffleButton = document.getElementById('shuffle');
    const repeatButton = document.getElementById('repeat');
    const shareButton = document.getElementById('share-btn');
    const closeShareModal = document.getElementById('close-share-modal');

    document.querySelector('.open-playlist-btn').addEventListener('click', function() {
        const welcomeScreen = document.querySelector('.welcome-screen');
        const container = document.querySelector('.container');
        
        welcomeScreen.style.opacity = '0';
        container.style.display = 'flex';
        container.style.opacity = '1';
        
        setTimeout(() => {
            welcomeScreen.style.display = 'none';
            try {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log("Fullscreen request failed");
                });
            } catch (e) {
                console.log("Fullscreen API not supported");
            }
        }, 500);
    });

    document.querySelectorAll('.progress-bar').forEach(bar => {
        bar.addEventListener('click', (e) => {
            if (!isPlayerReady) return;
            
            const rect = bar.getBoundingClientRect();
            const clickPosition = (e.clientX - rect.left) / rect.width;
            if (player.getDuration) {
                const newTime = clickPosition * player.getDuration();
                player.seekTo(newTime);
                
                const progress = (newTime / player.getDuration()) * 100;
                bar.querySelector('.progress').style.width = `${progress}%`;
                
                const songInfo = document.getElementById(`song-info-${currentSong + 1}`);
                songInfo.querySelector('.elapsed').textContent = formatTime(newTime);
                songInfo.querySelector('.remaining').textContent = formatTime(player.getDuration() - newTime);
            }
        });
    });

    pauseButton.addEventListener('click', togglePlay);
    prevButton.addEventListener('click', prevSong);
    nextButton.addEventListener('click', nextSong);
    
    favoriteButton.addEventListener('click', toggleFavorite);
    
    fullscreenButton.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log("Fullscreen request failed");
            });
        } else {
            document.exitFullscreen();
        }
    });
    
    volumeButton.addEventListener('click', toggleVolume);
    
    volumeSlider.addEventListener('input', (e) => {
        setVolume(e.target.value);
    });
    
    // Close volume slider when clicking outside
    document.addEventListener('click', (e) => {
        if (isVolumeSliderVisible && e.target !== volumeButton && e.target !== volumeSlider) {
            isVolumeSliderVisible = false;
            document.getElementById('volume-slider-container').classList.remove('active');
        }
    });
    
    shuffleButton.addEventListener('click', toggleShuffle);
    repeatButton.addEventListener('click', toggleRepeat);
    
    // Share modal
    shareButton.addEventListener('click', () => {
        document.getElementById('share-modal').classList.add('active');
    });
    
    closeShareModal.addEventListener('click', () => {
        document.getElementById('share-modal').classList.remove('active');
    });
    
    // Close modal when clicking outside
    document.getElementById('share-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('share-modal')) {
            document.getElementById('share-modal').classList.remove('active');
        }
    });

    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case ' ':
                e.preventDefault();
                togglePlay();
                break;
            case 'ArrowLeft':
                prevSong();
                break;
            case 'ArrowRight':
                nextSong();
                break;
            case 'f':
                fullscreenButton.click();
                break;
            case 'm':
                if (volume > 0) {
                    volumeSlider.value = 0;
                    setVolume(0);
                } else {
                    volumeSlider.value = 100;
                    setVolume(100);
                }
                break;
            case 's':
                toggleShuffle();
                break;
            case 'r':
                toggleRepeat();
                break;
        }
    });
    
    // Check if already favorited
    checkIfFavorited();
});
