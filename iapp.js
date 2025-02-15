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

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseTimeToSeconds(timeString) {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return minutes * 60 + seconds;
}

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
    });

    messagesList.appendChild(messageElement);
}

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

        const timedMessageButton = createTimedMessageButton();
        songEntry.appendChild(timedMessageButton);
        timedMessageButton.addEventListener('click', () => showTimedMessageModal(songEntry));
        
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
        
        const timedMessageButton = createTimedMessageButton();
        songEntry.appendChild(timedMessageButton);
        timedMessageButton.addEventListener('click', () => showTimedMessageModal(songEntry));
        
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

    const timedMessageButton = createTimedMessageButton();
    songEntry.appendChild(timedMessageButton);
    timedMessageButton.addEventListener('click', () => showTimedMessageModal(songEntry));

    document.getElementById('songs-container').appendChild(songEntry);
    songCount++;
    
    songEntry.querySelector('.remove-song').addEventListener('click', () => {
        songEntry.remove();
        songCount--;
    });
}

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

// Optimized URL checking code
const customUrlCheckbox = document.getElementById('custom-url-checkbox');
const customUrlField = document.getElementById('custom-url-field');
const customUrlInput = document.getElementById('custom-url');
const urlStatus = document.querySelector('.url-status');
let urlCheckTimeout;
let lastCheckedUrl = '';

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

async function checkUrlAvailability(url) {
    urlStatus.className = 'url-status';
    urlStatus.style.display = 'none';

    if (!url || !/^[a-zA-Z0-9]+$/.test(url)) {
        return;
    }

    if (url === lastCheckedUrl) {
        return;
    }

    try {
        lastCheckedUrl = url;
        const response = await fetch(`${BACKEND_URL}/api/url-available/${encodeURIComponent(url)}`);
        if (!response.ok) {
            throw new Error('Failed to check URL availability');
        }

        const data = await response.json();
        
        if (url === customUrlInput.value.trim()) {
            urlStatus.style.display = 'block';
            
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
        urlStatus.style.display = 'none';
        lastCheckedUrl = '';
    }
}

customUrlInput.addEventListener('input', (e) => {
    const url = e.target.value.trim();
    
    if (urlCheckTimeout) {
        clearTimeout(urlCheckTimeout);
    }

    urlStatus.className = 'url-status';
    urlStatus.style.display = 'none';

    if (url && url !== lastCheckedUrl) {
        urlCheckTimeout = setTimeout(() => checkUrlAvailability(url), 500);
    }
});

customUrlInput.addEventListener('blur', (e) => {
    const url = e.target.value.trim();
    if (url && url !== lastCheckedUrl) {
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
    if (!searchResults.contains(e.target) && !searchInput.contains(e.target)) {
        searchResults.classList.remove('active');
    }
});

document.querySelector('.add-song').addEventListener('click', addManualSong);
document.getElementById('playlist-form').addEventListener('submit', handleSubmit);
