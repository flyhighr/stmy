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
let isMobileMenuOpen = false;

// Theme handling
const themeButtons = document.querySelectorAll('.theme-btn');
themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        document.body.dataset.theme = theme;
        themeButtons.forEach(b => b.classList.remove('active'));
        document.querySelectorAll(`[data-theme="${theme}"]`).forEach(b => b.classList.add('active'));
        
        // Save theme preference
        localStorage.setItem('preferredTheme', theme);
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

// Mobile menu handling
// Replace your existing setupMobileMenu function with this improved version
function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const closeMobileMenuBtn = document.getElementById('close-mobile-menu');
    const mobileMenuPanel = document.querySelector('.mobile-menu-panel');
    
    // Remove any existing event listeners (to prevent duplicates)
    const newMobileMenuBtn = mobileMenuBtn.cloneNode(true);
    mobileMenuBtn.parentNode.replaceChild(newMobileMenuBtn, mobileMenuBtn);
    
    const newCloseMenuBtn = closeMobileMenuBtn.cloneNode(true);
    closeMobileMenuBtn.parentNode.replaceChild(newCloseMenuBtn, closeMobileMenuBtn);
    
    // Add multiple event types for better responsiveness
    newMobileMenuBtn.addEventListener('click', openMenu);
    newMobileMenuBtn.addEventListener('touchend', openMenu);
    
    newCloseMenuBtn.addEventListener('click', closeMenu);
    newCloseMenuBtn.addEventListener('touchend', closeMenu);
    
    // Event handler functions
    function openMenu(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        mobileMenuPanel.classList.add('active');
        isMobileMenuOpen = true;
        
        // Add visual feedback
        this.classList.add('button-active');
        setTimeout(() => {
            this.classList.remove('button-active');
        }, 200);
    }
    
    function closeMenu(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        mobileMenuPanel.classList.remove('active');
        isMobileMenuOpen = false;
        
        // Add visual feedback
        this.classList.add('button-active');
        setTimeout(() => {
            this.classList.remove('button-active');
        }, 200);
    }
    
    // Setup mobile controls with improved responsiveness
    const mobileControls = [
        { id: 'mobile-shuffle', action: toggleShuffle },
        { id: 'mobile-repeat', action: toggleRepeat },
        { id: 'mobile-favorite', action: toggleFavorite },
        { id: 'mobile-share', action: () => {
            mobileMenuPanel.classList.remove('active');
            isMobileMenuOpen = false;
            document.getElementById('share-modal').classList.add('active');
        }},
        { id: 'mobile-fullscreen', action: () => {
            mobileMenuPanel.classList.remove('active');
            isMobileMenuOpen = false;
            toggleFullscreen();
        }}
    ];
    
    mobileControls.forEach(control => {
        const element = document.getElementById(control.id);
        if (element) {
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
            
            newElement.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                control.action();
                updateMobileMenuButtons();
                
                // Add visual feedback
                this.classList.add('button-active');
                setTimeout(() => {
                    this.classList.remove('button-active');
                }, 200);
            });
            
            // Add touchend for better mobile response
            newElement.addEventListener('touchend', function(e) {
                e.preventDefault();
                e.stopPropagation();
                control.action();
                updateMobileMenuButtons();
                
                // Add visual feedback
                this.classList.add('button-active');
                setTimeout(() => {
                    this.classList.remove('button-active');
                }, 200);
            });
        }
    });
    
    // Mobile volume slider
    const mobileVolumeSlider = document.getElementById('mobile-volume-slider');
    if (mobileVolumeSlider) {
        mobileVolumeSlider.value = volume;
        
        mobileVolumeSlider.addEventListener('input', (e) => {
            setVolume(e.target.value);
        });
    }
    
    // Close when clicking outside - improve this to be more responsive
    document.addEventListener('click', (e) => {
        if (isMobileMenuOpen && 
            !mobileMenuPanel.contains(e.target) && 
            !newMobileMenuBtn.contains(e.target)) {
            mobileMenuPanel.classList.remove('active');
            isMobileMenuOpen = false;
        }
    });
    
    // Add touchend listener for better mobile response
    document.addEventListener('touchend', (e) => {
        if (isMobileMenuOpen && 
            !mobileMenuPanel.contains(e.target) && 
            !newMobileMenuBtn.contains(e.target)) {
            mobileMenuPanel.classList.remove('active');
            isMobileMenuOpen = false;
        }
    });
}

function updateMobileMenuButtons() {
    // Update shuffle button
    const mobileShuffleBtn = document.getElementById('mobile-shuffle');
    if (isShuffled) {
        mobileShuffleBtn.classList.add('active');
    } else {
        mobileShuffleBtn.classList.remove('active');
    }
    
    // Update repeat button
    const mobileRepeatBtn = document.getElementById('mobile-repeat');
    if (repeatMode !== 'none') {
        mobileRepeatBtn.classList.add('active');
        if (repeatMode === 'one') {
            mobileRepeatBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="17 1 21 5 17 9"></polyline>
                    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                    <path d="M12 19v-4"></path>
                    <path d="M12 15h-3"></path>
                </svg>
                <span>Repeat One</span>
            `;
        } else {
            mobileRepeatBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="17 1 21 5 17 9"></polyline>
                    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                    <polyline points="7 23 3 19 7 15"></polyline>
                    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                </svg>
                <span>Repeat All</span>
            `;
        }
    } else {
        mobileRepeatBtn.classList.remove('active');
        mobileRepeatBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
            <span>Repeat</span>
        `;
    }
    
    // Update favorite button
    const mobileFavoriteBtn = document.getElementById('mobile-favorite');
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const customUrl = getCustomUrl();
    
    if (favorites.includes(customUrl)) {
        mobileFavoriteBtn.classList.add('active');
        mobileFavoriteBtn.querySelector('svg').style.fill = '#ff4444';
    } else {
        mobileFavoriteBtn.classList.remove('active');
        mobileFavoriteBtn.querySelector('svg').style.fill = 'none';
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
        setupMobileMenu();
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
                setupMobileMenu();
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
    
    // Use a flag to prevent multiple swipes at once
    let isProcessingTouch = false;
    
    cardsContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchEndX = touchStartX; // Initialize touchEndX to prevent undefined behavior
    }, { passive: true });

    cardsContainer.addEventListener('touchmove', (e) => {
        if (isProcessingTouch) return;
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
        if (isProcessingTouch) return;
        const diff = touchStartX - touchEndX;
        const threshold = 50;

        if (Math.abs(diff) > threshold) {
            isProcessingTouch = true;
            
            if (diff > 0) {
                nextSong();
            } else {
                prevSong();
            }
            
            // Reset the flag after navigation completes
            setTimeout(() => {
                isProcessingTouch = false;
            }, 500);
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
    const cardPrevBtn = document.getElementById('card-prev');
    const cardNextBtn = document.getElementById('card-next');
    
    if (cardPrevBtn) cardPrevBtn.addEventListener('click', prevSong);
    if (cardNextBtn) cardNextBtn.addEventListener('click', nextSong);
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
    
    if (!playlistItems || !playlistCount) return;
    
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
    if (playlistToggle && playlistDrawer) {
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
        if (shuffleButton) shuffleButton.classList.add('active');
        
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
        if (shuffleButton) shuffleButton.classList.remove('active');
        
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
    
    // Update mobile menu buttons
    updateMobileMenuButtons();
}

function toggleRepeat() {
    const repeatButton = document.getElementById('repeat');
    
    if (repeatMode === 'none') {
        repeatMode = 'all';
        if (repeatButton) {
            repeatButton.classList.add('active');
        }
        showNotification('Repeat all songs');
    } else if (repeatMode === 'all') {
        repeatMode = 'one';
        if (repeatButton) {
            repeatButton.classList.add('active');
            repeatButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="17 1 21 5 17 9"></polyline>
                    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                    <path d="M12 19v-4"></path>
                    <path d="M12 15h-3"></path>
                </svg>
            `;
        }
        showNotification('Repeat current song');
    } else {
        repeatMode = 'none';
        if (repeatButton) {
            repeatButton.classList.remove('active');
            repeatButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="17 1 21 5 17 9"></polyline>
                    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                    <polyline points="7 23 3 19 7 15"></polyline>
                    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                </svg>
            `;
        }
        showNotification('Repeat disabled');
    }
    
    // Update mobile menu buttons
    updateMobileMenuButtons();
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
    
    if (player.getCurrentTime() > 3) {
        // If more than 3 seconds into the song, restart it
        player.seekTo(0);
    } else if (currentSong > 0) {
        // Go to previous song
        currentSong--;
        const videoId = extractVideoId(playlist.songs[currentSong].youtube_url);
        player.loadVideoById(videoId);
    } else if (repeatMode === 'all') {
        // If at first song and repeat all is on, go to last song
        currentSong = playlist.songs.length - 1;
        const videoId = extractVideoId(playlist.songs[currentSong].youtube_url);
        player.loadVideoById(videoId);
    }
    
    updateSongInfo();
}

function setVolume(value) {
    volume = value;
    if (player && player.setVolume) {
        player.setVolume(volume);
    }
    
    // Update both volume sliders
    const volumeSlider = document.getElementById('volume-slider');
    const mobileVolumeSlider = document.getElementById('mobile-volume-slider');
    
    if (volumeSlider) volumeSlider.value = volume;
    if (mobileVolumeSlider) mobileVolumeSlider.value = volume;
    
    // Save volume preference
    localStorage.setItem('preferredVolume', volume);
}

function toggleVolumeSlider() {
    const volumeSliderContainer = document.getElementById('volume-slider-container');
    isVolumeSliderVisible = !isVolumeSliderVisible;
    
    if (isVolumeSliderVisible) {
        volumeSliderContainer.classList.add('active');
    } else {
        volumeSliderContainer.classList.remove('active');
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            showNotification("Fullscreen not available");
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

function toggleFavorite() {
    const favoriteBtn = document.getElementById('favorite');
    const mobileFavoriteBtn = document.getElementById('mobile-favorite');
    const customUrl = getCustomUrl();
    
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    if (favorites.includes(customUrl)) {
        // Remove from favorites
        favorites = favorites.filter(url => url !== customUrl);
        if (favoriteBtn) {
            favoriteBtn.classList.remove('favorited');
            favoriteBtn.querySelector('svg').style.fill = 'none';
        }
        if (mobileFavoriteBtn) {
            mobileFavoriteBtn.classList.remove('active');
            mobileFavoriteBtn.querySelector('svg').style.fill = 'none';
        }
        showNotification('Removed from favorites');
    } else {
        // Add to favorites
        favorites.push(customUrl);
        if (favoriteBtn) {
            favoriteBtn.classList.add('favorited');
            favoriteBtn.querySelector('svg').style.fill = '#ff4444';
        }
        if (mobileFavoriteBtn) {
            mobileFavoriteBtn.classList.add('active');
            mobileFavoriteBtn.querySelector('svg').style.fill = '#ff4444';
        }
        showNotification('Added to favorites');
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
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

function checkFavoriteStatus() {
    const favoriteBtn = document.getElementById('favorite');
    const mobileFavoriteBtn = document.getElementById('mobile-favorite');
    const customUrl = getCustomUrl();
    
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    if (favorites.includes(customUrl)) {
        if (favoriteBtn) {
            favoriteBtn.classList.add('favorited');
            favoriteBtn.querySelector('svg').style.fill = '#ff4444';
        }
        if (mobileFavoriteBtn) {
            mobileFavoriteBtn.classList.add('active');
            mobileFavoriteBtn.querySelector('svg').style.fill = '#ff4444';
        }
    }
}

function setupEventListeners() {
    // Play/Pause button
    document.getElementById('pause').addEventListener('click', togglePlay);
    
    // Next and Previous buttons
    document.getElementById('next').addEventListener('click', nextSong);
    document.getElementById('prev').addEventListener('click', prevSong);
    
    // Shuffle button
    const shuffleBtn = document.getElementById('shuffle');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', toggleShuffle);
    }
    
    // Repeat button
    const repeatBtn = document.getElementById('repeat');
    if (repeatBtn) {
        repeatBtn.addEventListener('click', toggleRepeat);
    }
    
    // Volume button and slider
    const volumeBtn = document.getElementById('volume-btn');
    const volumeSlider = document.getElementById('volume-slider');
    
    if (volumeBtn) {
        volumeBtn.addEventListener('click', toggleVolumeSlider);
    }
    
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            setVolume(e.target.value);
        });
        
        // Hide volume slider when clicking outside
        document.addEventListener('click', (e) => {
            if (isVolumeSliderVisible && 
                e.target !== volumeBtn && 
                e.target !== volumeSlider && 
                !volumeBtn.contains(e.target)) {
                toggleVolumeSlider();
            }
        });
    }
    
    // Fullscreen button
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const mobilefullscreenBtn = document.getElementById('mobile-fullscreen');
    
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
    
    // Favorite button
    const favoriteBtn = document.getElementById('favorite');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', toggleFavorite);
    }
    
    // Share button and modal
    const shareBtn = document.getElementById('share-btn');
    const mobileShareBtn = document.getElementById('mobile-share');
    const shareModal = document.getElementById('share-modal');
    const closeShareModalBtn = document.getElementById('close-share-modal');
    
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            shareModal.classList.add('active');
        });
    }
    
    if (mobileShareBtn) {
        mobileShareBtn.addEventListener('click', () => {
            shareModal.classList.add('active');
        });
    }
    
    if (closeShareModalBtn) {
        closeShareModalBtn.addEventListener('click', () => {
            shareModal.classList.remove('active');
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === shareModal) {
            shareModal.classList.remove('active');
        }
    });
    
    // Progress bar interaction
    document.querySelectorAll('.progress-bar').forEach(bar => {
        bar.addEventListener('click', (e) => {
            if (!isPlayerReady) return;
            
            const rect = bar.getBoundingClientRect();
            const clickPosition = (e.clientX - rect.left) / rect.width;
            const duration = player.getDuration();
            
            player.seekTo(duration * clickPosition);
        });
    });
    
    // Welcome screen open button
    const openPlaylistBtn = document.querySelector('.open-playlist-btn');
    const welcomeScreen = document.querySelector('.welcome-screen');
    const container = document.querySelector('.container');
    
    if (openPlaylistBtn && welcomeScreen && container) {
        openPlaylistBtn.addEventListener('click', () => {
            welcomeScreen.style.opacity = '0';
            container.style.display = 'flex';
            
            setTimeout(() => {
                welcomeScreen.style.display = 'none';
                container.style.opacity = '1';
            }, 500);
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        
        switch (e.key) {
            case ' ':
                e.preventDefault();
                togglePlay();
                break;
            case 'ArrowRight':
                nextSong();
                break;
            case 'ArrowLeft':
                prevSong();
                break;
            case 'f':
                toggleFullscreen();
                break;
            case 'm':
                if (volume > 0) {
                    setVolume(0);
                } else {
                    setVolume(100);
                }
                break;
        }
    });
}

function loadSavedVolume() {
    const savedVolume = localStorage.getItem('preferredVolume');
    if (savedVolume !== null) {
        volume = parseInt(savedVolume);
        const volumeSlider = document.getElementById('volume-slider');
        const mobileVolumeSlider = document.getElementById('mobile-volume-slider');
        
        if (volumeSlider) volumeSlider.value = volume;
        if (mobileVolumeSlider) mobileVolumeSlider.value = volume;
    }
}

function detectiOS() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
        document.body.classList.add('ios-device');
    }
}

function improveButtonResponseTime() {
    // Apply to all buttons
    document.querySelectorAll('button').forEach(button => {
        // Reduce touch delay
        button.style.touchAction = 'manipulation';
        
        // Add touchstart listener for immediate feedback
        button.addEventListener('touchstart', function(e) {
            // Don't add this to elements with existing listeners
            if (this.dataset.hasTouchListener) return;
            
            this.classList.add('button-active');
            // Mark as having a listener to prevent duplicates
            this.dataset.hasTouchListener = 'true';
        }, { passive: true });
        
        // Remove feedback on touch end
        button.addEventListener('touchend', function() {
            this.classList.remove('button-active');
        }, { passive: true });
    });
}



// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    detectiOS();
    loadSavedTheme();
    loadSavedVolume();
    fetchPlaylist();
    setupEventListeners();
    checkFavoriteStatus();
    improveButtonResponseTime();
});

// Check for browser compatibility
function checkBrowserCompatibility() {
    const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isFirefox || isIOS) {
        const browserPopup = document.createElement('div');
        browserPopup.className = 'browser-popup';
        browserPopup.innerHTML = `
            <div class="popup-content">
                <p>For the best experience, please use Chrome, Edge, or Safari (on Mac).</p>
                <ol>
                    <li>Firefox may have issues with YouTube playback.</li>
                    <li>iOS devices have restrictions that may affect audio playback.</li>
                </ol>
                <button id="continue-anyway-btn">Continue Anyway</button>
            </div>
        `;
        
        document.body.appendChild(browserPopup);
        
        document.getElementById('continue-anyway-btn').addEventListener('click', () => {
            browserPopup.remove();
        });
    }
}

function improveMobileButtonResponsiveness() {
    // Add touchstart event listeners for better mobile response
    const touchButtons = [
        document.getElementById('pause'),
        document.getElementById('next'),
        document.getElementById('prev'),
        document.querySelectorAll('.mobile-control-btn')
    ];
    
    // Handle the play/pause button
    const pauseButton = document.getElementById('pause');
    if (pauseButton) {
        // Remove existing click event listeners
        const newPauseButton = pauseButton.cloneNode(true);
        pauseButton.parentNode.replaceChild(newPauseButton, pauseButton);
        
        // Add both click and touchstart events
        newPauseButton.addEventListener('click', function(e) {
            e.preventDefault();
            togglePlay();
        });
        
        newPauseButton.addEventListener('touchstart', function(e) {
            e.preventDefault();
            togglePlay();
        }, { passive: false });
    }
    
    // Handle next button
    const nextButton = document.getElementById('next');
    if (nextButton) {
        const newNextButton = nextButton.cloneNode(true);
        nextButton.parentNode.replaceChild(newNextButton, nextButton);
        
        newNextButton.addEventListener('click', function(e) {
            e.preventDefault();
            nextSong();
        });
        
        newNextButton.addEventListener('touchstart', function(e) {
            e.preventDefault();
            nextSong();
        }, { passive: false });
    }
    
    // Handle prev button
    const prevButton = document.getElementById('prev');
    if (prevButton) {
        const newPrevButton = prevButton.cloneNode(true);
        prevButton.parentNode.replaceChild(newPrevButton, prevButton);
        
        newPrevButton.addEventListener('click', function(e) {
            e.preventDefault();
            prevSong();
        });
        
        newPrevButton.addEventListener('touchstart', function(e) {
            e.preventDefault();
            prevSong();
        }, { passive: false });
    }
    
    // Add a small delay to prevent double triggering
    document.querySelectorAll('.control-btn, .mobile-control-btn').forEach(btn => {
        btn.addEventListener('touchstart', function(e) {
            // Add a class to show it's being touched
            this.classList.add('button-touched');
            setTimeout(() => {
                this.classList.remove('button-touched');
            }, 300);
        });
    });
}

// Check for browser compatibility on load
window.addEventListener('load', checkBrowserCompatibility);

// Handle YouTube API errors
window.addEventListener('error', function(e) {
    if (e.message.includes('YouTube') || e.filename.includes('youtube')) {
        showNotification('YouTube API error. Please try refreshing the page.');
    }
});

improveMobileButtonResponsiveness();
