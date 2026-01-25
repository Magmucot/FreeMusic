"use strict";

// ===== UTILITIES =====
const safeText = text => text.replace(/[<>]/g, "");
const qs = id => document.getElementById(id);
const qsa = selector => document.querySelectorAll(selector);

// ===== LOCALIZATION =====
const texts = {
    ru: {
        listenTitle: "Прослушивание",
        listenSubtitle: "Вставьте ссылку или название трека",
        playlistTitle: "Плейлисты",
        playlistSubtitle: "Добавляйте плейлисты по ссылке",
        track: "Демо-трек",
        artist: "Исполнитель",
        placeholderTrack: "Ссылка на трек или название...",
        placeholderPlaylist: "Ссылка на плейлист...",
        searchPlaceholder: "Поиск треков, артистов...",
        library: "Библиотека",
        favorites: "Избранное",
        downloaded: "Скачанные",
        userPlaylists: "Мои плейлисты",
        createPlaylist: "Создать плейлист",
        recentTitle: "Недавно прослушанные",
        allTracks: "Все",
        favoritesDesc: "Треки, которые вам понравились",
        downloadedDesc: "Доступны офлайн",
        emptyFavorites: "Нет избранных треков",
        emptyFavoritesHint: "Нажмите ♡ чтобы добавить трек в избранное",
        emptyDownloaded: "Нет скачанных треков",
        emptyDownloadedHint: "Нажмите 📥 чтобы скачать трек",
        emptyPlaylist: "Плейлист пуст",
        emptyPlaylistHint: "Добавьте треки с помощью кнопки ➕",
        addedToFavorites: "Добавлено в избранное",
        removedFromFavorites: "Удалено из избранного",
        addedToDownloaded: "Добавлено в скачанные",
        addedToPlaylist: "Добавлено в плейлист",
        tracksCount: "треков",
        createPlaylistTitle: "Создать плейлист",
        playlistNameLabel: "Название плейлиста",
        playlistIconLabel: "Выберите иконку",
        cancel: "Отмена",
        create: "Создать",
        playlistCreated: "Плейлист создан",
        playlistDeleted: "Плейлист удалён",
        addToPlaylistTitle: "Добавить в плейлист",
        noPlaylists: "Нет плейлистов. Создайте первый!",
        enterPlaylistName: "Введите название плейлиста"
    },
    en: {
        listenTitle: "Listening",
        listenSubtitle: "Paste track's link or name",
        playlistTitle: "Playlists",
        playlistSubtitle: "Add playlists by link",
        track: "Demo Track",
        artist: "Artist",
        placeholderTrack: "Track link or name...",
        placeholderPlaylist: "Playlist link...",
        searchPlaceholder: "Search tracks, artists...",
        library: "Library",
        favorites: "Favorites",
        downloaded: "Downloaded",
        userPlaylists: "My Playlists",
        createPlaylist: "Create Playlist",
        recentTitle: "Recently Played",
        allTracks: "All",
        favoritesDesc: "Tracks you liked",
        downloadedDesc: "Available offline",
        emptyFavorites: "No favorite tracks",
        emptyFavoritesHint: "Click ♡ to add track to favorites",
        emptyDownloaded: "No downloaded tracks",
        emptyDownloadedHint: "Click 📥 to download track",
        emptyPlaylist: "Playlist is empty",
        emptyPlaylistHint: "Add tracks using ➕ button",
        addedToFavorites: "Added to favorites",
        removedFromFavorites: "Removed from favorites",
        addedToDownloaded: "Added to downloaded",
        addedToPlaylist: "Added to playlist",
        tracksCount: "tracks",
        createPlaylistTitle: "Create Playlist",
        playlistNameLabel: "Playlist name",
        playlistIconLabel: "Choose icon",
        cancel: "Cancel",
        create: "Create",
        playlistCreated: "Playlist created",
        playlistDeleted: "Playlist deleted",
        addToPlaylistTitle: "Add to playlist",
        noPlaylists: "No playlists. Create your first!",
        enterPlaylistName: "Enter playlist name"
    }
};

// ===== STATE =====
let lang = "ru";
let theme = "dark";
let isPlaying = false;
let favorites = new Set();
let downloaded = new Set();
let userPlaylists = [];
let currentPlaylistId = null;
let selectedIcon = "🎵";
let currentTrackId = null;

// ===== LOAD FROM LOCALSTORAGE =====
function loadState() {
    try {
        const savedFavorites = localStorage.getItem("favorites");
        const savedDownloaded = localStorage.getItem("downloaded");
        const savedPlaylists = localStorage.getItem("userPlaylists");
        const savedLang = localStorage.getItem("lang");
        const savedTheme = localStorage.getItem("theme");

        if (savedFavorites) favorites = new Set(JSON.parse(savedFavorites));
        if (savedDownloaded) downloaded = new Set(JSON.parse(savedDownloaded));
        if (savedPlaylists) userPlaylists = JSON.parse(savedPlaylists);
        if (savedLang) lang = savedLang;
        if (savedTheme) {
            theme = savedTheme;
            document.documentElement.setAttribute("data-theme", theme);
        }
    } catch (e) {
        console.error("Error loading state:", e);
    }
}

// ===== SAVE TO LOCALSTORAGE =====
function saveState() {
    try {
        localStorage.setItem("favorites", JSON.stringify([...favorites]));
        localStorage.setItem("downloaded", JSON.stringify([...downloaded]));
        localStorage.setItem("userPlaylists", JSON.stringify(userPlaylists));
        localStorage.setItem("lang", lang);
        localStorage.setItem("theme", theme);
    } catch (e) {
        console.error("Error saving state:", e);
    }
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = "success") {
    const container = qs("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === "success" ? "✓" : "✕"}</span>
        <span class="toast-message">${safeText(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ===== APPLY LANGUAGE =====
function applyLang() {
    const t = texts[lang];

    // Main texts
    qs("listenTitle").textContent = t.listenTitle;
    qs("listenSubtitle").textContent = t.listenSubtitle;
    qs("playlistTitle").textContent = t.playlistTitle;
    qs("playlistSubtitle").textContent = t.playlistSubtitle;
    qs("trackInput").placeholder = t.placeholderTrack;
    qs("playlistInput").placeholder = t.placeholderPlaylist;
    qs("globalSearch").placeholder = t.searchPlaceholder;

    // Sidebar
    qs("libraryTitle").textContent = t.library;
    qs("favoritesName").textContent = t.favorites;
    qs("downloadedName").textContent = t.downloaded;
    qs("userPlaylistsLabel").textContent = t.userPlaylists;
    qs("addPlaylistLabel").textContent = t.createPlaylist;

    // Recent
    qs("recentTitle").textContent = t.recentTitle;

    // Tabs
    qs("tabAll").textContent = t.allTracks;
    qs("tabFavorites").innerHTML = `❤️ ${t.favorites}`;
    qs("tabDownloaded").innerHTML = `📥 ${t.downloaded}`;

    // Favorites & Downloaded views
    qs("favoritesTitle").textContent = t.favorites;
    qs("favoritesDesc").textContent = t.favoritesDesc;
    qs("downloadedTitle").textContent = t.downloaded;
    qs("downloadedDesc").textContent = t.downloadedDesc;
    qs("emptyFavoritesText").textContent = t.emptyFavorites;
    qs("emptyFavoritesHint").textContent = t.emptyFavoritesHint;
    qs("emptyDownloadedText").textContent = t.emptyDownloaded;
    qs("emptyDownloadedHint").textContent = t.emptyDownloadedHint;
    qs("emptyUserPlaylistText").textContent = t.emptyPlaylist;
    qs("emptyUserPlaylistHint").textContent = t.emptyPlaylistHint;

    // Modal
    qs("modalTitle").textContent = t.createPlaylistTitle;
    qs("labelPlaylistName").textContent = t.playlistNameLabel;
    qs("labelPlaylistIcon").textContent = t.playlistIconLabel;
    qs("cancelCreatePlaylist").textContent = t.cancel;
    qs("confirmCreatePlaylist").textContent = t.create;
    qs("playlistNameInput").placeholder = t.enterPlaylistName;
    qs("addToPlaylistTitle").textContent = t.addToPlaylistTitle;

    // Update lang button
    qs("langToggle").querySelector(".lang-text").textContent = lang === "ru" ? "EN" : "RU";
}

// ===== UPDATE COUNTS =====
function updateCounts() {
    qs("favoritesCount").textContent = favorites.size;
    qs("downloadedCount").textContent = downloaded.size;
}

// ===== RENDER USER PLAYLISTS IN SIDEBAR =====
function renderUserPlaylists() {
    const container = qs("userPlaylists");
    container.innerHTML = "";

    userPlaylists.forEach(playlist => {
        const item = document.createElement("div");
        item.className = "playlist-item";
        item.dataset.playlistId = playlist.id;
        item.innerHTML = `
            <span class="playlist-icon">${playlist.icon}</span>
            <span class="playlist-name">${safeText(playlist.name)}</span>
            <span class="playlist-count">${playlist.tracks.length}</span>
        `;
        item.onclick = () => openUserPlaylist(playlist.id);
        container.appendChild(item);
    });
}

// ===== OPEN USER PLAYLIST =====
function openUserPlaylist(playlistId) {
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;

    currentPlaylistId = playlistId;

    // Navigate to playlists view
    qsa(".nav-item, .view").forEach(el => el.classList.remove("active"));
    document.querySelector('[data-tab="playlists"]').classList.add("active");
    qs("playlists").classList.add("active");

    // Show user playlist view
    qsa(".tab-btn, .playlist-view").forEach(el => el.classList.remove("active"));
    qs("viewUserPlaylist").classList.add("active");

    // Update header
    qs("currentPlaylistIcon").textContent = playlist.icon;
    qs("currentPlaylistName").textContent = playlist.name;
    qs("currentPlaylistDesc").textContent = `${playlist.tracks.length} ${texts[lang].tracksCount}`;

    // Render tracks
    renderUserPlaylistTracks(playlist);

    // Mark active in sidebar
    qsa(".playlist-item").forEach(el => el.classList.remove("active"));
    document.querySelector(`[data-playlist-id="${playlistId}"]`)?.classList.add("active");
}

// ===== RENDER USER PLAYLIST TRACKS =====
function renderUserPlaylistTracks(playlist) {
    const container = qs("userPlaylistTracks");

    if (playlist.tracks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">${playlist.icon}</span>
                <p id="emptyUserPlaylistText">${texts[lang].emptyPlaylist}</p>
                <span class="empty-hint" id="emptyUserPlaylistHint">${texts[lang].emptyPlaylistHint}</span>
            </div>
        `;
        return;
    }

    container.innerHTML = "";
    playlist.tracks.forEach((track, index) => {
        const item = document.createElement("div");
        item.className = "track-item";
        item.dataset.id = track.id;
        item.innerHTML = `
            <span class="track-number">${index + 1}</span>
            <div class="track-cover-small"></div>
            <div class="track-item-info">
                <span class="track-item-name">${safeText(track.name)}</span>
                <span class="track-item-artist">${safeText(track.artist)}</span>
            </div>
            <span class="track-duration">${track.duration || "3:24"}</span>
            <button class="like-btn-small ${favorites.has(track.id) ? 'liked' : ''}" data-id="${track.id}">
                <span class="heart-small">${favorites.has(track.id) ? '❤' : '♡'}</span>
            </button>
            <button class="more-btn">⋯</button>
        `;
        container.appendChild(item);
    });

    // Attach like handlers
    container.querySelectorAll(".like-btn-small").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            toggleLike(btn.dataset.id, btn);
        };
    });
}

// ===== TOGGLE LIKE =====
function toggleLike(trackId, button) {
    const heartEl = button.querySelector(".heart-icon, .heart-small");
    const t = texts[lang];

    if (favorites.has(trackId)) {
        favorites.delete(trackId);
        button.classList.remove("liked");
        if (heartEl) heartEl.textContent = "♡";
        showToast(t.removedFromFavorites, "error");
    } else {
        favorites.add(trackId);
        button.classList.add("liked");
        if (heartEl) heartEl.textContent = "❤";
        showToast(t.addedToFavorites, "success");
    }

    updateCounts();
    updateFavoritesList();
    syncLikeButtons(trackId);
    saveState();
}

// ===== SYNC LIKE BUTTONS =====
function syncLikeButtons(trackId) {
    const isLiked = favorites.has(trackId);
    qsa(`[data-id="${trackId}"]`).forEach(el => {
        const likeBtn = el.querySelector(".like-btn-small") ||
            (el.classList.contains("like-btn-small") ? el : null);
        if (likeBtn) {
            const heart = likeBtn.querySelector(".heart-small");
            if (isLiked) {
                likeBtn.classList.add("liked");
                if (heart) heart.textContent = "❤";
            } else {
                likeBtn.classList.remove("liked");
                if (heart) heart.textContent = "♡";
            }
        }
    });
}

// ===== UPDATE FAVORITES LIST =====
function updateFavoritesList() {
    const list = qs("favoritesList");

    if (favorites.size === 0) {
        list.innerHTML = `
            <div class="empty-state" id="emptyFavorites">
                <span class="empty-icon">💔</span>
                <p id="emptyFavoritesText">${texts[lang].emptyFavorites}</p>
                <span class="empty-hint" id="emptyFavoritesHint">${texts[lang].emptyFavoritesHint}</span>
            </div>
        `;
        return;
    }

    list.innerHTML = "";
    let index = 1;

    favorites.forEach(trackId => {
        const trackEl = document.querySelector(`.track-item[data-id="${trackId}"]`) ||
            document.querySelector(`.recent-track[data-id="${trackId}"]`);

        if (trackEl) {
            const name = trackEl.querySelector(".track-item-name, .recent-name")?.textContent || "Track";
            const artist = trackEl.querySelector(".track-item-artist, .recent-artist")?.textContent || "Artist";

            const item = document.createElement("div");
            item.className = "track-item";
            item.dataset.id = trackId;
            item.innerHTML = `
                <span class="track-number">${index}</span>
                <div class="track-cover-small"></div>
                <div class="track-item-info">
                    <span class="track-item-name">${safeText(name)}</span>
                    <span class="track-item-artist">${safeText(artist)}</span>
                </div>
                <span class="track-duration">3:24</span>
                <button class="like-btn-small liked" data-id="${trackId}">
                    <span class="heart-small">❤</span>
                </button>
                <button class="more-btn">⋯</button>
            `;
            list.appendChild(item);
            index++;
        }
    });

    // Reattach event listeners
    list.querySelectorAll(".like-btn-small").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            toggleLike(btn.dataset.id, btn);
        };
    });
}

// ===== TOGGLE DOWNLOAD =====
function toggleDownload(trackId) {
    const t = texts[lang];

    if (!downloaded.has(trackId)) {
        downloaded.add(trackId);
        showToast(t.addedToDownloaded, "success");
    }

    updateCounts();
    updateDownloadedList();
    saveState();
}

// ===== UPDATE DOWNLOADED LIST =====
function updateDownloadedList() {
    const list = qs("downloadedList");

    if (downloaded.size === 0) {
        list.innerHTML = `
            <div class="empty-state" id="emptyDownloaded">
                <span class="empty-icon">📭</span>
                <p id="emptyDownloadedText">${texts[lang].emptyDownloaded}</p>
                <span class="empty-hint" id="emptyDownloadedHint">${texts[lang].emptyDownloadedHint}</span>
            </div>
        `;
        return;
    }

    list.innerHTML = "";
    let index = 1;

    downloaded.forEach(trackId => {
        const trackEl = document.querySelector(`.track-item[data-id="${trackId}"]`) ||
            document.querySelector(`.recent-track[data-id="${trackId}"]`);

        if (trackEl) {
            const name = trackEl.querySelector(".track-item-name, .recent-name")?.textContent || "Track";
            const artist = trackEl.querySelector(".track-item-artist, .recent-artist")?.textContent || "Artist";

            const item = document.createElement("div");
            item.className = "track-item";
            item.dataset.id = trackId;
            item.innerHTML = `
                <span class="track-number">${index}</span>
                <div class="track-cover-small"></div>
                <div class="track-item-info">
                    <span class="track-item-name">${safeText(name)}</span>
                    <span class="track-item-artist">${safeText(artist)}</span>
                </div>
                <span class="track-duration">3:24</span>
                <span class="downloaded-badge">📥</span>
                <button class="more-btn">⋯</button>
            `;
            list.appendChild(item);
            index++;
        }
    });
}

// ===== CREATE PLAYLIST MODAL =====
function openCreatePlaylistModal() {
    qs("createPlaylistModal").classList.remove("hidden");
    qs("playlistNameInput").value = "";
    qs("playlistNameInput").focus();
    selectedIcon = "🎵";
    qsa(".icon-option").forEach(opt => {
        opt.classList.toggle("selected", opt.dataset.icon === selectedIcon);
    });
}

function closeCreatePlaylistModal() {
    qs("createPlaylistModal").classList.add("hidden");
}

function createPlaylist() {
    const name = qs("playlistNameInput").value.trim();

    if (!name) {
        qs("playlistNameInput").focus();
        return;
    }

    const newPlaylist = {
        id: "playlist_" + Date.now(),
        name: name,
        icon: selectedIcon,
        tracks: [],
        createdAt: new Date().toISOString()
    };

    userPlaylists.push(newPlaylist);
    saveState();
    renderUserPlaylists();
    closeCreatePlaylistModal();
    showToast(texts[lang].playlistCreated, "success");
}

// ===== DELETE PLAYLIST =====
function deletePlaylist(playlistId) {
    userPlaylists = userPlaylists.filter(p => p.id !== playlistId);
    saveState();
    renderUserPlaylists();

    // Navigate back to all tracks
    qsa(".tab-btn, .playlist-view").forEach(el => el.classList.remove("active"));
    qs("tabAll").classList.add("active");
    qs("viewAll").classList.add("active");

    showToast(texts[lang].playlistDeleted, "error");
}

// ===== ADD TO PLAYLIST MODAL =====
function openAddToPlaylistModal(trackId) {
    currentTrackId = trackId;
    const modal = qs("addToPlaylistModal");
    const container = qs("playlistsSelect");

    if (userPlaylists.length === 0) {
        container.innerHTML = `<p class="no-playlists-msg">${texts[lang].noPlaylists}</p>`;
    } else {
        container.innerHTML = "";
        userPlaylists.forEach(playlist => {
            const item = document.createElement("div");
            item.className = "playlist-select-item";
            item.innerHTML = `
                <span class="playlist-icon">${playlist.icon}</span>
                <span class="playlist-name">${safeText(playlist.name)}</span>
                <span class="playlist-count">${playlist.tracks.length}</span>
            `;
            item.onclick = () => addTrackToPlaylist(playlist.id, trackId);
            container.appendChild(item);
        });
    }

    modal.classList.remove("hidden");
}

function closeAddToPlaylistModal() {
    qs("addToPlaylistModal").classList.add("hidden");
    currentTrackId = null;
}

function addTrackToPlaylist(playlistId, trackId) {
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;

    // Get track info
    const trackEl = document.querySelector(`.track-item[data-id="${trackId}"]`) ||
        document.querySelector(`.recent-track[data-id="${trackId}"]`);

    const trackInfo = {
        id: trackId,
        name: trackEl?.querySelector(".track-item-name, .recent-name")?.textContent || "Track",
        artist: trackEl?.querySelector(".track-item-artist, .recent-artist")?.textContent || "Artist",
        duration: trackEl?.querySelector(".track-duration")?.textContent || "3:24"
    };

    // Check if already in playlist
    if (!playlist.tracks.find(t => t.id === trackId)) {
        playlist.tracks.push(trackInfo);
        saveState();
        renderUserPlaylists();

        // Update view if currently viewing this playlist
        if (currentPlaylistId === playlistId) {
            renderUserPlaylistTracks(playlist);
        }
    }

    closeAddToPlaylistModal();
    showToast(texts[lang].addedToPlaylist, "success");
}

// ===== ICON PICKER =====
qsa(".icon-option").forEach(btn => {
    btn.onclick = () => {
        selectedIcon = btn.dataset.icon;
        qsa(".icon-option").forEach(opt => opt.classList.remove("selected"));
        btn.classList.add("selected");
    };
});

// ===== NAVIGATION =====
qsa(".nav-item").forEach(btn => {
    btn.onclick = () => {
        qsa(".nav-item, .view").forEach(el => el.classList.remove("active"));
        btn.classList.add("active");
        qs(btn.dataset.tab).classList.add("active");
    };
});

// ===== PLAYLIST TABS =====
qsa(".tab-btn").forEach(btn => {
    btn.onclick = () => {
        qsa(".tab-btn, .playlist-view").forEach(el => el.classList.remove("active"));
        btn.classList.add("active");
        const viewName = btn.dataset.playlistView;
        qs(`view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`).classList.add("active");
    };
});

// ===== SIDEBAR PLAYLIST ITEMS =====
qsa(".playlist-item[data-playlist]").forEach(item => {
    item.onclick = () => {
        // Navigate to playlists view
        qsa(".nav-item, .view").forEach(el => el.classList.remove("active"));
        document.querySelector('[data-tab="playlists"]').classList.add("active");
        qs("playlists").classList.add("active");

        // Activate corresponding tab
        const playlistType = item.dataset.playlist;
        if (playlistType === "favorites" || playlistType === "downloaded") {
            qsa(".tab-btn, .playlist-view").forEach(el => el.classList.remove("active"));
            document.querySelector(`[data-playlist-view="${playlistType}"]`).classList.add("active");
            qs(`view${playlistType.charAt(0).toUpperCase() + playlistType.slice(1)}`).classList.add("active");
        }
    };
});

// ===== LANGUAGE TOGGLE =====
qs("langToggle").onclick = () => {
    lang = lang === "ru" ? "en" : "ru";
    applyLang();
    saveState();
};

// ===== THEME TOGGLE =====
qs("themeToggle").onclick = () => {
    theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    qs("themeToggle").querySelector(".theme-icon").textContent = theme === "dark" ? "🌙" : "☀️";
    saveState();
};

// ===== LOAD TRACK =====
qs("loadTrack").onclick = () => {
    qs("loader").classList.remove("hidden");

    setTimeout(() => {
        qs("loader").classList.add("hidden");
        qs("trackTitle").textContent = texts[lang].track;
        qs("trackArtist").textContent = texts[lang].artist;
        qs("audio").src = "demo.mp3";
        qs("player").classList.remove("hidden");
        qs("audio").play().catch(() => { });
        isPlaying = true;
        currentTrackId = "current_" + Date.now();
        updatePlayButton();
    }, 800);
};

// ===== PLAY/PAUSE CONTROLS =====
function updatePlayButton() {
    const mainBtn = qs("mainPlayBtn");
    const playPauseBtn = qs("playPauseBtn");

    if (isPlaying) {
        mainBtn.textContent = "⏸";
        playPauseBtn.textContent = "⏸";
    } else {
        mainBtn.textContent = "▶";
        playPauseBtn.textContent = "▶";
    }
}

qs("mainPlayBtn").onclick = () => {
    const audio = qs("audio");
    if (isPlaying) {
        audio.pause();
    } else {
        audio.play().catch(() => { });
    }
    isPlaying = !isPlaying;
    updatePlayButton();
};

qs("playPauseBtn").onclick = () => {
    qs("mainPlayBtn").click();
};

// ===== LIKE BUTTON (PLAYER) =====
qs("likeBtn").onclick = () => {
    if (currentTrackId) {
        toggleLike(currentTrackId, qs("likeBtn"));
    }
};

// ===== DOWNLOAD BUTTON =====
qs("downloadBtn").onclick = () => {
    if (currentTrackId) {
        toggleDownload(currentTrackId);
    }
};

// ===== ADD TO PLAYLIST BUTTON =====
qs("addToPlaylistBtn").onclick = () => {
    if (currentTrackId) {
        openAddToPlaylistModal(currentTrackId);
    }
};

// ===== LIKE BUTTONS (LISTS) =====
qsa(".like-btn-small").forEach(btn => {
    btn.onclick = (e) => {
        e.stopPropagation();
        toggleLike(btn.dataset.id, btn);
    };
});

// ===== VOLUME CONTROL =====
qs("volumeSlider").oninput = (e) => {
    const volume = e.target.value / 100;
    qs("audio").volume = volume;

    const icon = qs("volumeIcon");
    if (volume === 0) {
        icon.textContent = "🔇";
    } else if (volume < 0.5) {
        icon.textContent = "🔉";
    } else {
        icon.textContent = "🔊";
    }
};

qs("volumeIcon").onclick = () => {
    const audio = qs("audio");
    const slider = qs("volumeSlider");
    const icon = qs("volumeIcon");

    if (audio.volume > 0) {
        audio.dataset.prevVolume = audio.volume;
        audio.volume = 0;
        slider.value = 0;
        icon.textContent = "🔇";
    } else {
        audio.volume = audio.dataset.prevVolume || 0.8;
        slider.value = audio.volume * 100;
        icon.textContent = "🔊";
    }
};

// ===== AUDIO PROGRESS =====
qs("audio").ontimeupdate = () => {
    const audio = qs("audio");
    const progress = (audio.currentTime / audio.duration) * 100 || 0;
    qs("progressFill").style.width = `${progress}%`;

    // Update time display
    qs("currentTime").textContent = formatTime(audio.currentTime);
    qs("duration").textContent = formatTime(audio.duration);
};

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ===== PROGRESS BAR CLICK =====
qs("progressBar").onclick = (e) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const audio = qs("audio");
    if (audio.duration) {
        audio.currentTime = pos * audio.duration;
    }
};

// ===== DRAG & DROP FOR TRACKS =====
let draggedItem = null;

qsa(".track-item[draggable]").forEach(item => {
    item.ondragstart = (e) => {
        draggedItem = item;
        item.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
    };

    item.ondragend = () => {
        item.classList.remove("dragging");
        draggedItem = null;
    };

    item.ondragover = (e) => {
        e.preventDefault();
        if (draggedItem && draggedItem !== item) {
            const list = item.parentNode;
            const items = [...list.querySelectorAll(".track-item:not(.dragging)")];
            const currentPos = items.indexOf(item);

            if (currentPos > items.indexOf(draggedItem)) {
                item.after(draggedItem);
            } else {
                item.before(draggedItem);
            }
        }
    };
});

// ===== SHUFFLE & REPEAT BUTTONS =====
qs("shuffleBtn").onclick = () => {
    qs("shuffleBtn").classList.toggle("active");
};

qs("repeatBtn").onclick = () => {
    qs("repeatBtn").classList.toggle("active");
};

// ===== CREATE PLAYLIST BUTTON =====
qs("addPlaylistSidebar").onclick = openCreatePlaylistModal;

// ===== MODAL EVENTS =====
qs("closeModal").onclick = closeCreatePlaylistModal;
qs("cancelCreatePlaylist").onclick = closeCreatePlaylistModal;
qs("confirmCreatePlaylist").onclick = createPlaylist;

qs("closeAddToPlaylistModal").onclick = closeAddToPlaylistModal;

// Close modals on overlay click
qs("createPlaylistModal").onclick = (e) => {
    if (e.target === qs("createPlaylistModal")) {
        closeCreatePlaylistModal();
    }
};

qs("addToPlaylistModal").onclick = (e) => {
    if (e.target === qs("addToPlaylistModal")) {
        closeAddToPlaylistModal();
    }
};

// Enter key in playlist name input
qs("playlistNameInput").onkeydown = (e) => {
    if (e.key === "Enter") {
        createPlaylist();
    }
};

// ===== DELETE PLAYLIST BUTTON =====
qs("deletePlaylistBtn").onclick = () => {
    if (currentPlaylistId) {
        deletePlaylist(currentPlaylistId);
    }
};

// ===== INITIALIZE =====
loadState();
applyLang();
updateCounts();
renderUserPlaylists();

// Update theme icon on load
qs("themeToggle").querySelector(".theme-icon").textContent = theme === "dark" ? "🌙" : "☀️";

// ===== WAVEFORM ANIMATION =====
function generateWaveform() {
    const waveform = qs("waveform");
    waveform.innerHTML = "";

    for (let i = 0; i < 50; i++) {
        const bar = document.createElement("div");
        bar.className = "waveform-bar";
        bar.style.cssText = `
            display: inline-block;
            width: 3px;
            background: var(--accent);
            border-radius: 2px;
            height: ${20 + Math.random() * 28}px;
            animation: waveAnim ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate;
            animation-delay: ${Math.random() * 0.5}s;
        `;
        waveform.appendChild(bar);
    }
}

// Add waveform animation keyframes
const style = document.createElement("style");
style.textContent = `
    @keyframes waveAnim {
        from { height: 10px; opacity: 0.3; }
        to { height: 48px; opacity: 0.7; }
    }
`;
document.head.appendChild(style);

generateWaveform();