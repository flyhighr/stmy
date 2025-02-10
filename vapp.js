
        let player;
        let currentSong = 0;
        let progressInterval;
        let playlist;
        let isPlayerReady = false;
        let touchStartX = 0;
        let touchEndX = 0;

        // Theme handling
        const themeButtons = document.querySelectorAll('.theme-btn');
        themeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.dataset.theme = btn.dataset.theme;
                themeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

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
                    'onStateChange': onPlayerStateChange
                }
            });
        }

        async function fetchPlaylist() {
            const customUrl = getCustomUrl();
            if (!customUrl) {
                window.location.href = '/index.html';
                return;
            }

            try {
                const response = await fetch(`https://ptrmoy.onrender.com/api/playlists/${customUrl}`);
                if (!response.ok) throw new Error('Playlist not found');
                
                playlist = await response.json();
                localStorage.setItem('currentPlaylist', JSON.stringify({ url: customUrl, data: playlist }));
                history.replaceState({}, '', '/' + customUrl);
                
                initializeViewer();
                initializeYouTubePlayer();
            } catch (error) {
                const storedPlaylist = localStorage.getItem('currentPlaylist');
                if (storedPlaylist) {
                    const parsed = JSON.parse(storedPlaylist);
                    if (parsed.url === customUrl) {
                        playlist = parsed.data;
                        history.replaceState({}, '', '/' + customUrl);
                        initializeViewer();
                        initializeYouTubePlayer();
                        return;
                    }
                }
                console.error('Error:', error);
                window.location.href = '/index.html';
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
                    }
                });
            });
        }

        function generateCards() {
            const cardsContainer = document.getElementById('cards-container');
            cardsContainer.innerHTML = playlist.songs.map((song, index) => `
                <div class="card" id="song-${index + 1}">
                    <img src="${song.cover_url}" alt="${song.title}" loading="lazy">
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
            updateSongInfo();
        }

        function onPlayerStateChange(event) {
            const pauseButton = document.getElementById('pause');
            
            if (event.data == YT.PlayerState.ENDED) {
                nextSong();
                pauseButton.textContent = '▶';
            } else if (event.data == YT.PlayerState.PLAYING) {
                pauseButton.textContent = '▐▐';
                startProgress();
            } else if (event.data == YT.PlayerState.PAUSED) {
                pauseButton.textContent = '▶';
                clearInterval(progressInterval);
            }
        }

        function updateSongInfo() {
            document.querySelectorAll('.song-info').forEach(info => info.classList.remove('active'));
            document.getElementById(`song-info-${currentSong + 1}`).classList.add('active');
            updateCardClasses();
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
            if (player.getPlayerState() === YT.PlayerState.PLAYING) {
                player.pauseVideo();
                pauseButton.textContent = '▶';
                clearInterval(progressInterval);
            } else {
                player.playVideo();
                pauseButton.textContent = '▐▐';
                startProgress();
            }
        }

        function nextSong() {
            if (!isPlayerReady) return;
            
            clearInterval(progressInterval);
            currentSong = (currentSong + 1) % playlist.songs.length;
            const videoId = extractVideoId(playlist.songs[currentSong].youtube_url);
            player.loadVideoById(videoId);
            updateSongInfo();
        }

        function prevSong() {
            if (!isPlayerReady) return;
            
            clearInterval(progressInterval);
            currentSong = (currentSong - 1 + playlist.songs.length) % playlist.songs.length;
            const videoId = extractVideoId(playlist.songs[currentSong].youtube_url);
            player.loadVideoById(videoId);
            updateSongInfo();
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

        document.addEventListener('DOMContentLoaded', () => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            if (userAgent.indexOf('Instagram') > -1) {
                showBrowserNotice();
            }
            fetchPlaylist();

            const pauseButton = document.getElementById('pause');
            const prevButton = document.getElementById('prev');
            const nextButton = document.getElementById('next');
            const favoriteButton = document.getElementById('favorite');
            const fullscreenButton = document.getElementById('fullscreen-btn');

            document.querySelector('.open-playlist-btn').addEventListener('click', function() {
                const welcomeScreen = document.querySelector('.welcome-screen');
                const container = document.querySelector('.container');
                
                welcomeScreen.style.opacity = '0';
                container.style.display = 'flex';
                container.style.opacity = '1';
                
                setTimeout(() => {
                    welcomeScreen.style.display = 'none';
                    document.documentElement.requestFullscreen().catch(err => {
                        console.log("Fullscreen request failed");
                    });
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
            
            favoriteButton.addEventListener('click', () => {
                favoriteButton.classList.toggle('favorited');
                favoriteButton.textContent = favoriteButton.classList.contains('favorited') ? '♥' : '♡';
            });

            fullscreenButton.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => {
                        console.log("Fullscreen request failed");
                    });
                } else {
                    document.exitFullscreen();
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
                }
            });
        });
