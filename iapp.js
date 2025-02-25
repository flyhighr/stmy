// Constants and Global Variables
const BACKEND_URL = 'https://ptrmoy.onrender.com';
let songCount = 0;

// DOM Elements
const searchInput = document.querySelector('.search-input');
const searchButton = document.querySelector('.search-button');
const searchResults = document.querySelector('.search-results');
const loading = document.querySelector('.loading');
const customUrlCheckbox = document.getElementById('custom-url-checkbox');
const customUrlField = document.getElementById('custom-url-field');
const customUrlInput = document.getElementById('custom-url');
const urlStatus = document.querySelector('.url-status');
const songsContainer = document.getElementById('songs-container');
const songCountDisplay = document.querySelector('.song-count');

// URL Checking Variables
let urlCheckTimeout;
let lastCheckedUrl = '';

// Initialize song count display
function updateSongCountDisplay() {
    songCountDisplay.textContent = `${songCount} song${songCount !== 1 ? 's' : ''}`;
    
    // Toggle empty playlist message
    const emptyPlaylist = document.querySelector('.empty-playlist');
    if (songCount > 0 && emptyPlaylist) {
        emptyPlaylist.style.display = 'none';
    } else if (songCount === 0 && !document.querySelector('.empty-playlist')) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-playlist';
        emptyMsg.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
            </svg>
            <p>Your playlist is empty. Add songs using one of the methods above.</p>
        `;
        songsContainer.appendChild(emptyMsg);
    }
}

// Tab Navigation
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.input-method').forEach(m => m.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-method`).classList.add('active');
    });
});

// Utility Functions
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseTimeToSeconds(timeString) {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return minutes * 60 + seconds;
}

// UI Component Creation Functions
function createTimedMessageButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'add-timed-message';
    button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        Add Timed Message
    `;
    return button;
}

function createTimedMessagesList() {
    const container = document.createElement('div');
    container.className = 'timed-messages-list';
    return container;
}

// Timed Message Functions
function showTimedMessageModal(songEntry) {
    const template = document.getElementById('timed-message-modal-template');
    const modal = template.content.cloneNode(true).querySelector('.modal');
    document.body.appendChild(modal);

    const messagesList = songEntry.querySelector('.timed-messages-list');
    const existingMessages = messagesList ? Array.from(messagesList.children).length : 0;

    if (existingMessages >= 50) {
        alert('Maximum 50 timed messages allowed per song');
        modal.remove();
        return;
    }

    const startTimeInput = modal.querySelector('#message-start-time');
    const endTimeInput = modal.querySelector('#message-end-time');
    const messageInput = modal.querySelector('#timed-message');

    function validateTimeFormat(input) {
    input.addEventListener('input', (e) => {
        let value = e.target.value;
        if (value.length === 2 && !value.includes(':')) {
            value += ':';
            e.target.value = value;
        }
        const timeRegex = /^[0-5][0-9]:[0-5][0-9]$/;
        if (value && !timeRegex.test(value)) {
            input.setCustomValidity('Please enter time in MM:SS format');
        } else {
            input.setCustomValidity('');
        }
    });
}

    validateTimeFormat(startTimeInput);
    validateTimeFormat(endTimeInput);

    modal.querySelector('.save-message').addEventListener('click', () => {
        if (!startTimeInput.value || !messageInput.value) {
            alert('Start time and message are required');
            return;
        }

        const timeRegex = /^[0-5][0-9]:[0-5][0-9]$/;
        if (!timeRegex.test(startTimeInput.value) || (endTimeInput.value && !timeRegex.test(endTimeInput.value))) {
            alert('Please enter valid times in MM:SS format');
            return;
        }

        if (endTimeInput.value) {
            const startSeconds = parseTimeToSeconds(startTimeInput.value);
            const endSeconds = parseTimeToSeconds(endTimeInput.value);
            if (endSeconds <= startSeconds) {
                alert('End time must be after start time');
                return;
            }
        }

        addTimedMessage(
            songEntry,
            startTimeInput.value,
            messageInput.value,
            endTimeInput.value || null
        );
        modal.remove();
    });

    modal.querySelector('.cancel-message').addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function addTimedMessage(songEntry, startTime, message, endTime = null) {
    let messagesList = songEntry.querySelector('.timed-messages-list');
    if (!messagesList) {
        messagesList = createTimedMessagesList();
        songEntry.appendChild(messagesList);
    }

    const messageElement = document.createElement('div');
    messageElement.className = 'timed-message';
    messageElement.innerHTML = `
        <span class="time">${startTime}${endTime ? ' - ' + endTime : ''}</span>
        <span class="message">${message}</span>
        <button type="button" class="remove-message">×</button>
    `;

    messageElement.querySelector('.remove-message').addEventListener('click', () => {
        messageElement.remove();
        if (messagesList.children.length === 0) {
            messagesList.remove();
        }
    });

    messagesList.appendChild(messageElement);
}

// API Functions
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
        if (songs.length === 0) {
            searchResults.innerHTML = '<div class="song-card no-results">No songs found. Try a different search term.</div>';
        } else {
            songs.forEach(song => {
                const songCard = document.createElement('div');
                songCard.className = 'song-card';
                songCard.innerHTML = `
                    <img src="${song.cover_url}" alt="${song.title}" onerror="this.src='https://via.placeholder.com/60?text=No+Image'">
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
        }
        
        searchResults.classList.add('active');
    } catch (error) {
        console.error('Error searching songs:', error);
        searchResults.innerHTML = '<div class="song-card error">Error searching songs. Please try again.</div>';
        searchResults.classList.add('active');
    } finally {
        loading.classList.remove('active');
    }
}

// Song Management Functions
async function addSpotifySong(spotifySong) {
    if (songCount >= 100) {
        alert('Maximum 100 songs allowed');
        return;
    }
    console.log('Adding Spotify song:', spotifySong);
    
    // Remove empty playlist message if it exists
    const emptyPlaylist = document.querySelector('.empty-playlist');
    if (emptyPlaylist) {
        emptyPlaylist.remove();
    }
    
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
    updateSongCountDisplay();

    try {
        console.log('Fetching YouTube URL...');
        const youtubeUrl = await getYouTubeUrl(spotifySong.title, spotifySong.artist);
        console.log('Received YouTube URL:', youtubeUrl);
        
        songEntry.innerHTML = `
            <div class="song-header">
                <img src="${spotifySong.cover_url}" alt="${spotifySong.title}" onerror="this.src='https://via.placeholder.com/60?text=No+Image'">
                <div class="song-details">
                    <div class="song-title-display">${spotifySong.title}</div>
                    <div class="song-artist-display">${spotifySong.artist}</div>
                </div>
                <button type="button" class="remove-song">×</button>
            </div>
            
            <div class="song-fields">
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
            </div>
        `;

        const timedMessageButton = createTimedMessageButton();
        songEntry.appendChild(timedMessageButton);
        timedMessageButton.addEventListener('click', () => showTimedMessageModal(songEntry));
        
        const removeButton = songEntry.querySelector('.remove-song');
        if (removeButton) {
            removeButton.addEventListener('click', () => {
                songEntry.remove();
                songCount--;
                updateSongCountDisplay();
            });
        }

        const youtubeInput = songEntry.querySelector('.song-youtube');
        console.log('YouTube input value after setting:', youtubeInput?.value);
        
    } catch (error) {
        console.error('Error in addSpotifySong:', error);
        songEntry.innerHTML = `
            <div class="song-header">
                <img src="${spotifySong.cover_url}" alt="${spotifySong.title}" onerror="this.src='https://via.placeholder.com/60?text=No+Image'">
                <div class="song-details">
                    <div class="song-title-display">${spotifySong.title}</div>
                    <div class="song-artist-display">${spotifySong.artist}</div>
                </div>
                <button type="button" class="remove-song">×</button>
            </div>
            
            <div class="song-fields">
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
                        <input type="url" class="song-youtube" placeholder="Paste the YouTube video URL" required>
                    </div>
                    <span class="error-message">Auto-fill failed. Please enter URL manually.</span>
                </div>
            </div>
        `;
        
        const timedMessageButton = createTimedMessageButton();
        songEntry.appendChild(timedMessageButton);
        timedMessageButton.addEventListener('click', () => showTimedMessageModal(songEntry));
        
        const removeButton = songEntry.querySelector('.remove-song');
        if (removeButton) {
            removeButton.addEventListener('click', () => {
                songEntry.remove();
                songCount--;
                updateSongCountDisplay();
            });
        }
    }
}

function addManualSong() {
    if (songCount >= 100) {
        alert('Maximum 100 songs allowed');
        return;
    }

    // Remove empty playlist message if it exists
    const emptyPlaylist = document.querySelector('.empty-playlist');
    if (emptyPlaylist) {
        emptyPlaylist.remove();
    }

    const songEntry = document.createElement('div');
    songEntry.className = 'song-entry';
    songEntry.innerHTML = `
        <div class="song-header">
            <div class="song-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                </svg>
            </div>
            <div class="song-details">
                <div class="song-title-display">New Song</div>
                <div class="song-artist-display">Add details below</div>
            </div>
            <button type="button" class="remove-song">×</button>
        </div>
        
        <div class="song-fields">
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
        </div>
    `;

    const timedMessageButton = createTimedMessageButton();
    songEntry.appendChild(timedMessageButton);
    timedMessageButton.addEventListener('click', () => showTimedMessageModal(songEntry));

    document.getElementById('songs-container').appendChild(songEntry);
    songCount++;
    updateSongCountDisplay();
    
    // Update song title and artist display when inputs change
    const titleInput = songEntry.querySelector('.song-title');
    const artistInput = songEntry.querySelector('.song-artist');
    const titleDisplay = songEntry.querySelector('.song-title-display');
    const artistDisplay = songEntry.querySelector('.song-artist-display');
    
    titleInput.addEventListener('input', () => {
        titleDisplay.textContent = titleInput.value || 'New Song';
    });
    
    artistInput.addEventListener('input', () => {
        artistDisplay.textContent = artistInput.value || 'Add details below';
    });
    
    songEntry.querySelector('.remove-song').addEventListener('click', () => {
        songEntry.remove();
        songCount--;
        updateSongCountDisplay();
    });
    
    // Focus on the title input for immediate editing
    titleInput.focus();
}

// Spotify Playlist Import
async function importSpotifyPlaylist(playlistUrl) {
    const spotifyLoading = document.querySelector('.spotify-loading');
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'import-status';
    document.querySelector('.spotify-container').appendChild(loadingMessage);
    
    spotifyLoading.classList.add('active');
    loadingMessage.textContent = 'Fetching playlist...';
    
    try {
        const response = await fetch(
            `${BACKEND_URL}/api/spotify-playlist/${encodeURIComponent(playlistUrl)}`
        );
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to fetch playlist');
        }
        
        const data = await response.json();
        const tracks = data.tracks;
        
        if (!tracks || tracks.length === 0) {
            throw new Error('No tracks found in playlist');
        }
        
        if (songCount + tracks.length > 100) {
            throw new Error(`You can only add up to 100 songs. This playlist has ${tracks.length} songs.`);
        }
        
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            loadingMessage.textContent = `Importing song ${i + 1} of ${tracks.length}...`;
            
            try {
                await addSpotifySong(track);
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                                console.error(`Error importing track ${track.title}:`, error);
                loadingMessage.textContent = `Warning: Failed to import "${track.title}". Continuing with next song...`;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        loadingMessage.textContent = 'Playlist import complete!';
        loadingMessage.style.color = '#4CAF50';
        setTimeout(() => loadingMessage.remove(), 5000);
        
    } catch (error) {
        console.error('Error importing playlist:', error);
        loadingMessage.textContent = `Error: ${error.message}`;
        loadingMessage.style.color = '#f44336';
        setTimeout(() => loadingMessage.remove(), 5000);
    } finally {
        spotifyLoading.classList.remove('active');
    }
}

// Form Submission
async function handleSubmit(e) {
    e.preventDefault();

    const senderName = document.getElementById('sender-name').value;
    const customUrl = customUrlCheckbox.checked ? document.getElementById('custom-url').value.trim() : undefined;
    const welcomeMessage = document.getElementById('welcome-message').value;

    const songs = Array.from(document.querySelectorAll('.song-entry')).map(entry => {
        const timedMessages = Array.from(entry.querySelectorAll('.timed-message')).map(msg => {
            const timeText = msg.querySelector('.time').textContent;
            const [startTime, endTime] = timeText.split(' - ');
            return {
                start_time: startTime,
                end_time: endTime || null,
                message: msg.querySelector('.message').textContent
            };
        });

        return {
            title: entry.querySelector('.song-title').value,
            artist: entry.querySelector('.song-artist').value,
            cover_url: entry.querySelector('.song-cover').value,
            youtube_url: entry.querySelector('.song-youtube').value,
            timed_messages: timedMessages
        };
    });

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

    // Show loading state
    const submitButton = document.querySelector('.submit-playlist');
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = 'Creating Playlist...';
    submitButton.disabled = true;
    submitButton.style.opacity = '0.7';

    try {
        const response = await fetch(`${BACKEND_URL}/api/playlists`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(playlistData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to create playlist');
        }

        const data = await response.json();
        
        // Remove any existing success message
        const existingSuccess = document.querySelector('.success');
        if (existingSuccess) {
            existingSuccess.remove();
        }
        
        // Create success message with animation
        const successDiv = document.createElement('div');
        successDiv.className = 'success';
        successDiv.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <h3>Playlist created successfully!</h3>
            <p>Share this link with someone special:</p>
            <strong>${window.location.origin}/${data.custom_url}</strong>
            <div class="success-actions">
                <button class="copy-link">Copy Link</button>
                <button class="create-new">Create Another Playlist</button>
            </div>
        `;
        
        document.querySelector('.container').appendChild(successDiv);
        
        // Add event listeners to success buttons
        successDiv.querySelector('.copy-link').addEventListener('click', () => {
            navigator.clipboard.writeText(`${window.location.origin}/${data.custom_url}`)
                .then(() => {
                    const copyBtn = successDiv.querySelector('.copy-link');
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy Link';
                    }, 2000);
                })
                .catch(err => {
                    console.error('Could not copy text: ', err);
                    alert('Could not copy link. Please copy it manually.');
                });
        });
        
        successDiv.querySelector('.create-new').addEventListener('click', () => {
            document.getElementById('playlist-form').reset();
            document.getElementById('songs-container').innerHTML = '';
            songCount = 0;
            updateSongCountDisplay();
            successDiv.remove();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        // Scroll to success message
        successDiv.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Error:', error);
        alert(`Failed to create playlist: ${error.message}`);
    } finally {
        // Restore button state
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
        submitButton.style.opacity = '1';
    }
}

// URL Availability Checking
async function checkUrlAvailability(url) {
    urlStatus.style.display = 'block';
    urlStatus.className = 'url-status';
    if (!url) {
        urlStatus.textContent = 'Please enter a custom URL';
        urlStatus.className = 'url-status unavailable';
        return;
    }
    
    if (url.length < 3) {
        urlStatus.textContent = 'URL must be at least 3 characters long';
        urlStatus.className = 'url-status unavailable';
        return;
    }
    
    if (!/^[a-zA-Z0-9]+$/.test(url)) {
        urlStatus.textContent = 'URL can only contain letters and numbers';
        urlStatus.className = 'url-status unavailable';
        return;
    }

    if (url === lastCheckedUrl) {
        return;
    }

    try {
        lastCheckedUrl = url;
        urlStatus.textContent = 'Checking availability...';
        urlStatus.className = 'url-status';
        
        const response = await fetch(`${BACKEND_URL}/api/url-available/${encodeURIComponent(url)}`);
        if (!response.ok) {
            throw new Error('Failed to check URL availability');
        }

        const data = await response.json();
        
        if (url === customUrlInput.value.trim()) {
            if (data.available) {
                urlStatus.textContent = '✓ Available';
                urlStatus.className = 'url-status available';
            } else {
                urlStatus.textContent = '✗ Unavailable';
                urlStatus.className = 'url-status unavailable';
            }
        }
    } catch (error) {
        console.error('Error checking URL availability:', error);
        urlStatus.textContent = 'Error checking URL availability';
        urlStatus.className = 'url-status unavailable';
        lastCheckedUrl = '';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize song count display
    updateSongCountDisplay();
    
    customUrlCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            customUrlField.classList.add('active');
            customUrlInput.setAttribute('required', 'required');
            const currentUrl = customUrlInput.value.trim();
            if (currentUrl && currentUrl !== lastCheckedUrl) {
                checkUrlAvailability(currentUrl);
            }
        } else {
            customUrlField.classList.remove('active');
            customUrlInput.removeAttribute('required');
            customUrlInput.value = '';
            urlStatus.className = 'url-status';
            urlStatus.style.display = 'none';
            lastCheckedUrl = '';
        }
    });

    customUrlInput.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        
        if (urlCheckTimeout) {
            clearTimeout(urlCheckTimeout);
        }

        checkUrlAvailability(url);
        
        if (url && url.length >= 3 && /^[a-zA-Z0-9]+$/.test(url) && url !== lastCheckedUrl) {
            urlCheckTimeout = setTimeout(() => checkUrlAvailability(url), 500);
        }
    });

    customUrlInput.addEventListener('blur', (e) => {
        const url = e.target.value.trim();
        if (url && url.length >= 3 && url !== lastCheckedUrl) {
            checkUrlAvailability(url);
        }
    });

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
        if (!searchResults.contains(e.target) && !searchInput.contains(e.target) && !searchButton.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });

    document.querySelector('.add-song').addEventListener('click', addManualSong);
    document.getElementById('playlist-form').addEventListener('submit', handleSubmit);

    // Spotify Playlist Import Event Listener
    document.querySelector('.import-playlist')?.addEventListener('click', () => {
        const playlistUrl = document.querySelector('.spotify-input').value.trim();
        if (!playlistUrl) {
            alert('Please enter a Spotify playlist URL');
            return;
        }
        
        const spotifyUrlRegex = /^https:\/\/open\.spotify\.com\/playlist\/[a-zA-Z0-9]+(\?.*)?$/;
        if (!spotifyUrlRegex.test(playlistUrl)) {
            alert('Please enter a valid Spotify playlist URL (e.g., https://open.spotify.com/playlist/...)');
            return;
        }
        
        importSpotifyPlaylist(playlistUrl);
    });
});
