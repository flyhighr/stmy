        const BACKEND_URL = 'https://ptrmoy.onrender.com';
        let songCount = 0;

        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.input-method').forEach(m => m.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(`${tab.dataset.tab}-method`).classList.add('active');
            });
        });

        const searchInput = document.querySelector('.search-input');
        const searchButton = document.querySelector('.search-button');
        const searchResults = document.querySelector('.search-results');
        const loading = document.querySelector('.loading');

        async function getYouTubeUrl(title, artist) {
            try {
                console.log(`Searching YouTube for: ${title} - ${artist}`);
                const response = await fetch(
                    `${BACKEND_URL}/api/youtube-url?` + 
                    new URLSearchParams({
                        title: title,
                        artist: artist
                    })
                );
                const data = await response.json();
                console.log('YouTube search response:', data);
                return data.youtube_url;
            } catch (error) {
                console.error('Error getting YouTube URL:', error);
                return null;
            }
        }

        async function searchSongs(query) {
            try {
                loading.classList.add('active');
                searchResults.classList.remove('active');
                
                const response = await fetch(`${BACKEND_URL}/api/search/songs/${encodeURIComponent(query)}`);
                const songs = await response.json();
                
                searchResults.innerHTML = '';
                songs.forEach(song => {
                    const songCard = document.createElement('div');
                    songCard.className = 'song-card';
                    songCard.innerHTML = `
                        <img src="${song.cover_url}" alt="${song.title}">
                        <div class="song-info">
                            <div class="song-title">${song.title}</div>
                            <div class="song-artist">${song.artist}</div>
                        </div>
                    `;
                    
                    songCard.addEventListener('click', () => {
                        addSpotifySong(song);
                        searchResults.classList.remove('active');
                        searchInput.value = '';
                    });
                    
                    searchResults.appendChild(songCard);
                });
                
                searchResults.classList.add('active');
            } catch (error) {
                console.error('Error searching songs:', error);
                searchResults.innerHTML = '<div class="song-card">Error searching songs. Please try again.</div>';
                searchResults.classList.add('active');
            } finally {
                loading.classList.remove('active');
            }
        }

        async function addSpotifySong(spotifySong) {
            if (songCount >= 100) {
                alert('Maximum 100 songs allowed');
                return;
            }
            console.log('Adding Spotify song:', spotifySong);
            const songEntry = document.createElement('div');
            songEntry.className = 'song-entry';
            songEntry.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <span>Finding YouTube link...</span>
                </div>
            `;
            document.getElementById('songs-container').appendChild(songEntry);
            songCount++;
        
            try {
                console.log('Fetching YouTube URL...');
                const youtubeUrl = await getYouTubeUrl(spotifySong.title, spotifySong.artist);
                console.log('Received YouTube URL:', youtubeUrl);
                
                songEntry.innerHTML = `
                    <button type="button" class="remove-song">Remove</button>
                    <div class="form-group">
                        <label>Song Title</label>
                        <input type="text" class="song-title" value="${spotifySong.title}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Artist</label>
                        <input type="text" class="song-artist" value="${spotifySong.artist}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Cover Image URL</label>
                        <input type="url" class="song-cover" value="${spotifySong.cover_url}" readonly>
                    </div>
                    <div class="form-group youtube-url-group">
                        <label>YouTube URL</label>
                        <div class="youtube-input-wrapper">
                            <input type="url" 
                                   class="song-youtube" 
                                   value="${youtubeUrl || ''}" 
                                   placeholder="Paste the YouTube video URL" 
                                   required
                                   ${youtubeUrl ? 'data-auto-filled="true"' : ''}>
                            ${youtubeUrl ? '<span class="auto-filled-badge">Auto-filled ✓</span>' : ''}
                        </div>
                    </div>
                `;
                
                const removeButton = songEntry.querySelector('.remove-song');
                if (removeButton) {
                    removeButton.addEventListener('click', () => {
                        songEntry.remove();
                        songCount--;
                    });
                }
        
                const youtubeInput = songEntry.querySelector('.song-youtube');
                console.log('YouTube input value after setting:', youtubeInput?.value);
                
            } catch (error) {
                console.error('Error in addSpotifySong:', error);
                songEntry.innerHTML = `
                    <button type="button" class="remove-song">Remove</button>
                    <div class="form-group">
                        <label>Song Title</label>
                        <input type="text" class="song-title" value="${spotifySong.title}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Artist</label>
                        <input type="text" class="song-artist" value="${spotifySong.artist}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Cover Image URL</label>
                        <input type="url" class="song-cover" value="${spotifySong.cover_url}" readonly>
                    </div>
                    <div class="form-group">
                        <label>YouTube URL</label>
                        <input type="url" class="song-youtube" placeholder="Paste the YouTube video URL" required>
                        <span class="error-message">Auto-fill failed. Please enter URL manually.</span>
                    </div>
                `;
                
                const removeButton = songEntry.querySelector('.remove-song');
                if (removeButton) {
                    removeButton.addEventListener('click', () => {
                        songEntry.remove();
                        songCount--;
                    });
                }
            }
        }

        function addManualSong() {
            if (songCount >= 100) {
                alert('Maximum 100 songs allowed');
                return;
            }

            const songEntry = document.createElement('div');
            songEntry.className = 'song-entry';
            songEntry.innerHTML = `
                <button type="button" class="remove-song">Remove</button>
                <div class="form-group">
                    <label>Song Title</label>
                    <input type="text" class="song-title" placeholder="Enter the song title" required>
                </div>
                <div class="form-group">
                    <label>Artist</label>
                    <input type="text" class="song-artist" placeholder="Enter the artist name" required>
                </div>
                <div class="form-group">
                    <label>Cover Image URL</label>
                    <input type="url" class="song-cover" placeholder="Paste the album cover image URL" required>
                </div>
                <div class="form-group">
                    <label>YouTube URL</label>
                    <input type="url" class="song-youtube" placeholder="Paste the YouTube video URL" required>
                </div>
            `;

            document.getElementById('songs-container').appendChild(songEntry);
            songCount++;
            
            songEntry.querySelector('.remove-song').addEventListener('click', () => {
                songEntry.remove();
                songCount--;
            });
        }

        const customUrlCheckbox = document.getElementById('custom-url-checkbox');
        const customUrlField = document.getElementById('custom-url-field');
        const customUrlInput = document.getElementById('custom-url');
        const urlStatus = document.querySelector('.url-status');
        let urlCheckTimeout;
        
        customUrlCheckbox.addEventListener('change', async (e) => {
            if (e.target.checked) {
                customUrlField.classList.add('active');
                customUrlInput.setAttribute('required', 'required');
                if (customUrlInput.value.trim()) {
                    await checkUrlAvailability(customUrlInput.value.trim());
                }
            } else {
                customUrlField.classList.remove('active');
                customUrlInput.removeAttribute('required');
                customUrlInput.value = '';
                urlStatus.className = 'url-status';
                urlStatus.style.display = 'none';
            }
        });
        
        async function checkUrlAvailability(url) {
            urlStatus.className = 'url-status';
            urlStatus.style.display = 'none';
        
            if (!url || !/^[a-zA-Z0-9]+$/.test(url)) {
                return;
            }
        
            try {
                const response = await fetch(`${BACKEND_URL}/api/url-available/${encodeURIComponent(url)}`);
                if (!response.ok) {
                    throw new Error('Failed to check URL availability');
                }
        
                const data = await response.json();
                urlStatus.style.display = 'block';
        
                if (data.available) {
                    urlStatus.textContent = '✓ Available';
                    urlStatus.className = 'url-status available';
                } else {
                    urlStatus.textContent = '✗ Unavailable';
                    urlStatus.className = 'url-status unavailable';
                }
            } catch (error) {
                console.error('Error checking URL availability:', error);
                urlStatus.style.display = 'none';
            }
        }
        
        customUrlInput.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            
            if (urlCheckTimeout) {
                clearTimeout(urlCheckTimeout);
            }
            urlStatus.className = 'url-status';
            urlStatus.style.display = 'none';
            if (url) {
                urlCheckTimeout = setTimeout(() => checkUrlAvailability(url), 300);
            }
        });
        
        customUrlInput.addEventListener('blur', (e) => {
            const url = e.target.value.trim();
            if (url) {
                checkUrlAvailability(url);
            }
        });

        async function handleSubmit(e) {
            e.preventDefault();

            const senderName = document.getElementById('sender-name').value;
            const customUrl = customUrlCheckbox.checked ? document.getElementById('custom-url').value.trim() : undefined;
            const welcomeMessage = document.getElementById('welcome-message').value;

            const songs = Array.from(document.querySelectorAll('.song-entry')).map(entry => ({
                title: entry.querySelector('.song-title').value,
                artist: entry.querySelector('.song-artist').value,
                cover_url: entry.querySelector('.song-cover').value,
                youtube_url: entry.querySelector('.song-youtube').value
            }));

            if (songs.length === 0) {
                alert('Please add at least one song to your playlist');
                return;
            }

            const playlistData = {
                sender_name: senderName,
                custom_url: customUrl,
                welcome_message: welcomeMessage,
                songs: songs
            };

            try {
                const response = await fetch(`${BACKEND_URL}/api/playlists`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(playlistData)
                });

                if (!response.ok) {
                    throw new Error('Failed to create playlist');
                }

                const data = await response.json();
                
                const successDiv = document.createElement('div');
                successDiv.className = 'success';
                successDiv.innerHTML = `
                    ✨ Playlist created successfully! ✨<br>
                    Share this link with someone special:<br>
                    <strong>${window.location.origin}/${data.custom_url}</strong>
                `;
                
                document.querySelector('.container').appendChild(successDiv);
                
                document.getElementById('playlist-form').reset();
                document.getElementById('songs-container').innerHTML = '';
                songCount = 0;

            } catch (error) {
                console.error('Error:', error);
                alert('Failed to create playlist. Please try again.');
            }
        }

        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                searchSongs(query);
            }
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = searchInput.value.trim();
                if (query) {
                    searchSongs(query);
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (!searchResults.contains(e.target) && !searchInput.contains(e.target)) {
                searchResults.classList.remove('active');
            }
        });

        document.querySelector('.add-song').addEventListener('click', addManualSong);
        document.getElementById('playlist-form').addEventListener('submit', handleSubmit);
