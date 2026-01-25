"use strict";

// ===== UTILITIES =====
const safeText = text => {
    if (typeof text !== 'string') return '';
    return text.replace(/[<>]/g, "");
};

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
        enterPlaylistName: "Введите название плейлиста",
        sortByName: "По названию",
        sortByArtist: "По исполнителю",
        sortByDate: "По дате добавления",
        sortByDuration: "По длительности"
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
        enterPlaylistName: "Enter playlist name",
        sortByName: "By name",
        sortByArtist: "By artist",
        sortByDate: "By date added",
        sortByDuration: "By duration"
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
let currentSortType = "date";
let currentSortDirection = "desc";

// ===== DRAG & DROP STATE =====
let draggedElement = null;
let draggedPlaylistId = null;

// ===== LOAD FROM LOCALSTORAGE =====
function loadState() {
    try {
        const savedFavorites = localStorage.getItem("favorites");
        const savedDownloaded = localStorage.getItem("downloaded");
        const savedPlaylists = localStorage.getItem("userPlaylists");
        const savedLang = localStorage.getItem("lang");
        const savedTheme = localStorage.getItem("theme");

        if (savedFavorites) {
            const parsed = JSON.parse(savedFavorites);
            if (Array.isArray(parsed)) {
                favorites = new Set(parsed);
            }
        }
        if (savedDownloaded) {
            const parsed = JSON.parse(savedDownloaded);
            if (Array.isArray(parsed)) {
                downloaded = new Set(parsed);
            }
        }
        if (savedPlaylists) {
            const parsed = JSON.parse(savedPlaylists);
            if (Array.isArray(parsed)) {
                userPlaylists = parsed;
            }
        }
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
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === "success" ? "✓" : "✕"}</span>
        <span class="toast-message">${safeText(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

// ===== APPLY LANGUAGE =====
function applyLang() {
    const t = texts[lang];
    if (!t) return;

    const safeSet = (id, prop, value) => {
        const el = qs(id);
        if (el && value !== undefined) {
            if (prop === 'textContent') el.textContent = value;
            else if (prop === 'placeholder') el.placeholder = value;
            else if (prop === 'innerHTML') el.innerHTML = value;
        }
    };

    safeSet("listenTitle", "textContent", t.listenTitle);
    safeSet("listenSubtitle", "textContent", t.listenSubtitle);
    safeSet("playlistTitle", "textContent", t.playlistTitle);
    safeSet("playlistSubtitle", "textContent", t.playlistSubtitle);
    safeSet("trackInput", "placeholder", t.placeholderTrack);
    safeSet("playlistInput", "placeholder", t.placeholderPlaylist);
    safeSet("globalSearch", "placeholder", t.searchPlaceholder);

    safeSet("libraryTitle", "textContent", t.library);
    safeSet("favoritesName", "textContent", t.favorites);
    safeSet("downloadedName", "textContent", t.downloaded);
    safeSet("userPlaylistsLabel", "textContent", t.userPlaylists);
    safeSet("addPlaylistLabel", "textContent", t.createPlaylist);

    safeSet("recentTitle", "textContent", t.recentTitle);

    safeSet("tabAll", "textContent", t.allTracks);
    safeSet("tabFavorites", "innerHTML", `❤️ ${t.favorites}`);
    safeSet("tabDownloaded", "innerHTML", `📥 ${t.downloaded}`);

    safeSet("favoritesTitle", "textContent", t.favorites);
    safeSet("favoritesDesc", "textContent", t.favoritesDesc);
    safeSet("downloadedTitle", "textContent", t.downloaded);
    safeSet("downloadedDesc", "textContent", t.downloadedDesc);
    safeSet("emptyFavoritesText", "textContent", t.emptyFavorites);
    safeSet("emptyFavoritesHint", "textContent", t.emptyFavoritesHint);
    safeSet("emptyDownloadedText", "textContent", t.emptyDownloaded);
    safeSet("emptyDownloadedHint", "textContent", t.emptyDownloadedHint);
    safeSet("emptyUserPlaylistText", "textContent", t.emptyPlaylist);
    safeSet("emptyUserPlaylistHint", "textContent", t.emptyPlaylistHint);

    safeSet("modalTitle", "textContent", t.createPlaylistTitle);
    safeSet("labelPlaylistName", "textContent", t.playlistNameLabel);
    safeSet("labelPlaylistIcon", "textContent", t.playlistIconLabel);
    safeSet("cancelCreatePlaylist", "textContent", t.cancel);
    safeSet("confirmCreatePlaylist", "textContent", t.create);
    safeSet("playlistNameInput", "placeholder", t.enterPlaylistName);
    safeSet("addToPlaylistTitle", "textContent", t.addToPlaylistTitle);

    const langToggle = qs("langToggle");
    if (langToggle) {
        const langText = langToggle.querySelector(".lang-text");
        if (langText) langText.textContent = lang === "ru" ? "EN" : "RU";
    }

    updateSortMenu();
}

// ===== UPDATE COUNTS =====
function updateCounts() {
    const favCount = qs("favoritesCount");
    const dlCount = qs("downloadedCount");
    if (favCount) favCount.textContent = favorites.size;
    if (dlCount) dlCount.textContent = downloaded.size;
}

// ===== RENDER USER PLAYLISTS IN SIDEBAR =====
function renderUserPlaylists() {
    const container = qs("userPlaylists");
    if (!container) return;

    container.innerHTML = "";

    userPlaylists.forEach(playlist => {
        if (!playlist || !playlist.id) return;

        const item = document.createElement("div");
        item.className = "playlist-item";
        item.dataset.playlistId = playlist.id;

        const tracksCount = Array.isArray(playlist.tracks) ? playlist.tracks.length : 0;

        item.innerHTML = `
            <span class="playlist-icon">${safeText(playlist.icon || "🎵")}</span>
            <span class="playlist-name">${safeText(playlist.name || "Без названия")}</span>
            <span class="playlist-count">${tracksCount}</span>
        `;
        item.onclick = () => openUserPlaylist(playlist.id);
        container.appendChild(item);
    });
}

// ===== NAVIGATE TO HOME =====
function navigateToHome() {
    qsa(".nav-item, .view").forEach(el => el.classList.remove("active"));

    const listenTab = document.querySelector('[data-tab="listen"]');
    const listenView = qs("listen");

    if (listenTab) listenTab.classList.add("active");
    if (listenView) listenView.classList.add("active");

    qsa(".playlist-item").forEach(el => el.classList.remove("active"));
}

// ===== OPEN USER PLAYLIST =====
function openUserPlaylist(playlistId) {
    const playlist = userPlaylists.find(p => p && p.id === playlistId);
    if (!playlist) return;

    currentPlaylistId = playlistId;

    qsa(".nav-item, .view").forEach(el => el.classList.remove("active"));
    const playlistsTab = document.querySelector('[data-tab="playlists"]');
    const playlistsView = qs("playlists");
    if (playlistsTab) playlistsTab.classList.add("active");
    if (playlistsView) playlistsView.classList.add("active");

    qsa(".tab-btn, .playlist-view").forEach(el => el.classList.remove("active"));
    const userPlaylistView = qs("viewUserPlaylist");
    if (userPlaylistView) userPlaylistView.classList.add("active");

    const iconEl = qs("currentPlaylistIcon");
    const nameEl = qs("currentPlaylistName");
    const descEl = qs("currentPlaylistDesc");

    const tracksCount = Array.isArray(playlist.tracks) ? playlist.tracks.length : 0;

    if (iconEl) iconEl.textContent = playlist.icon || "🎵";
    if (nameEl) nameEl.textContent = playlist.name || "Без названия";
    if (descEl) descEl.textContent = `${tracksCount} ${texts[lang].tracksCount}`;

    renderUserPlaylistTracks(playlist);

    qsa(".playlist-item").forEach(el => el.classList.remove("active"));
    const activeItem = document.querySelector(`[data-playlist-id="${playlistId}"]`);
    if (activeItem) activeItem.classList.add("active");
}

// ===== RENDER USER PLAYLIST TRACKS =====
function renderUserPlaylistTracks(playlist) {
    const container = qs("userPlaylistTracks");
    if (!container) return;

    const tracks = Array.isArray(playlist.tracks) ? playlist.tracks : [];

    if (tracks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">${safeText(playlist.icon || "🎵")}</span>
                <p id="emptyUserPlaylistText">${texts[lang].emptyPlaylist}</p>
                <span class="empty-hint" id="emptyUserPlaylistHint">${texts[lang].emptyPlaylistHint}</span>
            </div>
        `;
        return;
    }

    container.innerHTML = "";
    tracks.forEach((track, index) => {
        if (!track) return;

        const trackId = track.id || `track_${index}`;
        const item = document.createElement("div");
        item.className = "track-item";
        item.draggable = true;
        item.dataset.id = trackId;
        item.dataset.index = index;

        item.innerHTML = `
            <span class="drag-handle" title="Перетащить">⠿</span>
            <span class="track-number">${index + 1}</span>
            <div class="track-cover-small"></div>
            <div class="track-item-info">
                <span class="track-item-name">${safeText(track.name || "Без названия")}</span>
                <span class="track-item-artist">${safeText(track.artist || "Неизвестный")}</span>
            </div>
            <span class="track-duration">${safeText(track.duration || "0:00")}</span>
            <button class="like-btn-small ${favorites.has(trackId) ? 'liked' : ''}" data-id="${trackId}">
                <span class="heart-small">${favorites.has(trackId) ? '❤' : '♡'}</span>
            </button>
            <button class="more-btn">⋯</button>
        `;
        container.appendChild(item);
    });

    // Attach like handlers
    container.querySelectorAll(".like-btn-small").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            if (id) toggleLike(id, btn);
        };
    });

    // Initialize drag and drop
    initDragAndDrop(container, playlist.id);
}

// ===== DRAG AND DROP =====
function initDragAndDrop(container, playlistId) {
    if (!container) return;

    const items = container.querySelectorAll(".track-item[draggable='true']");

    items.forEach(item => {
        // Remove old listeners by cloning
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);

        // Re-attach like button handler
        const likeBtn = newItem.querySelector(".like-btn-small");
        if (likeBtn) {
            likeBtn.onclick = (e) => {
                e.stopPropagation();
                const id = likeBtn.dataset.id;
                if (id) toggleLike(id, likeBtn);
            };
        }

        // Drag Start
        newItem.addEventListener("dragstart", function (e) {
            draggedElement = this;
            draggedPlaylistId = playlistId;

            this.classList.add("dragging");
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", this.dataset.id || "");

            // Delay for visual feedback
            requestAnimationFrame(() => {
                this.style.opacity = "0.4";
            });
        });

        // Drag End - ВАЖНО: здесь сохраняем новый порядок
        newItem.addEventListener("dragend", function () {
            this.classList.remove("dragging");
            this.style.opacity = "";

            // Remove all visual indicators
            container.querySelectorAll(".drag-over-top, .drag-over-bottom, .drag-over").forEach(el => {
                el.classList.remove("drag-over-top", "drag-over-bottom", "drag-over");
            });

            // Save new order
            if (draggedPlaylistId) {
                saveNewTrackOrder(container, draggedPlaylistId);
            }

            // Update track numbers
            updateTrackNumbers(container);

            // Reset state
            draggedElement = null;
            draggedPlaylistId = null;
        });

        // Drag Over - визуальный feedback и перемещение
        newItem.addEventListener("dragover", function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";

            if (!draggedElement || draggedElement === this) return;

            const rect = this.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;

            // Remove old indicators
            container.querySelectorAll(".drag-over-top, .drag-over-bottom").forEach(el => {
                el.classList.remove("drag-over-top", "drag-over-bottom");
            });

            // Add visual indicator
            if (e.clientY < midY) {
                this.classList.add("drag-over-top");
                this.classList.remove("drag-over-bottom");
            } else {
                this.classList.add("drag-over-bottom");
                this.classList.remove("drag-over-top");
            }
        });

        // Drag Enter
        newItem.addEventListener("dragenter", function (e) {
            e.preventDefault();
            if (draggedElement && draggedElement !== this) {
                this.classList.add("drag-over");
            }
        });

        // Drag Leave
        newItem.addEventListener("dragleave", function (e) {
            if (!this.contains(e.relatedTarget)) {
                this.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");
            }
        });

        // Drop - перемещаем элемент
        newItem.addEventListener("drop", function (e) {
            e.preventDefault();
            e.stopPropagation();

            if (!draggedElement || draggedElement === this) return;

            const rect = this.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;

            // Insert before or after
            if (e.clientY < midY) {
                this.parentNode.insertBefore(draggedElement, this);
            } else {
                this.parentNode.insertBefore(draggedElement, this.nextSibling);
            }

            // Clean up
            this.classList.remove("drag-over", "drag-over-top", "drag-over-bottom");
        });
    });

    // Container-level drop for edge cases
    container.addEventListener("dragover", function (e) {
        e.preventDefault();
    });

    container.addEventListener("drop", function (e) {
        e.preventDefault();
        // If dropped on container (not on item), append to end
        if (e.target === container && draggedElement) {
            container.appendChild(draggedElement);
        }
    });
}

// ===== SAVE NEW TRACK ORDER =====
function saveNewTrackOrder(container, playlistId) {
    const playlist = userPlaylists.find(p => p && p.id === playlistId);
    if (!playlist || !Array.isArray(playlist.tracks)) return;

    const newOrder = [];
    const items = container.querySelectorAll(".track-item");

    items.forEach(item => {
        const trackId = item.dataset.id;
        if (!trackId) return;

        const track = playlist.tracks.find(t => t && t.id === trackId);
        if (track) {
            newOrder.push(track);
        }
    });

    // Only save if order actually changed
    if (newOrder.length === playlist.tracks.length) {
        playlist.tracks = newOrder;
        saveState();
    }
}

// ===== UPDATE TRACK NUMBERS =====
function updateTrackNumbers(container) {
    if (!container) return;

    const items = container.querySelectorAll(".track-item");
    items.forEach((item, index) => {
        const numberEl = item.querySelector(".track-number");
        if (numberEl) {
            numberEl.textContent = index + 1;
        }
        item.dataset.index = index;
    });
}

// ===== SORTING =====
function parseDuration(str) {
    if (!str || typeof str !== 'string') return 0;
    const parts = str.split(":").map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts[0] * 60 + parts[1];
    }
    return 0;
}

function sortTracks(tracks, type, direction) {
    if (!Array.isArray(tracks)) return [];

    const sorted = [...tracks];

    sorted.sort((a, b) => {
        if (!a || !b) return 0;

        let valA, valB;

        switch (type) {
            case "name":
                valA = (a.name || a.title || "").toLowerCase();
                valB = (b.name || b.title || "").toLowerCase();
                break;
            case "artist":
                valA = (a.artist || "").toLowerCase();
                valB = (b.artist || "").toLowerCase();
                break;
            case "duration":
                valA = parseDuration(a.duration);
                valB = parseDuration(b.duration);
                break;
            case "date":
            default:
                valA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
                valB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
                break;
        }

        if (typeof valA === "string") {
            const cmp = valA.localeCompare(valB);
            return direction === "asc" ? cmp : -cmp;
        } else {
            return direction === "asc" ? valA - valB : valB - valA;
        }
    });

    return sorted;
}

function updateSortMenu() {
    const t = texts[lang];
    const sortMenu = qs("sortMenu");
    if (!sortMenu || !t) return;

    const getArrow = (type) => {
        if (currentSortType !== type) return '';
        return currentSortDirection === 'asc' ? ' ↑' : ' ↓';
    };

    sortMenu.innerHTML = `
        <button class="sort-option ${currentSortType === 'name' ? 'active' : ''}" data-sort="name">
            ${t.sortByName}${getArrow('name')}
        </button>
        <button class="sort-option ${currentSortType === 'artist' ? 'active' : ''}" data-sort="artist">
            ${t.sortByArtist}${getArrow('artist')}
        </button>
        <button class="sort-option ${currentSortType === 'date' ? 'active' : ''}" data-sort="date">
            ${t.sortByDate}${getArrow('date')}
        </button>
        <button class="sort-option ${currentSortType === 'duration' ? 'active' : ''}" data-sort="duration">
            ${t.sortByDuration}${getArrow('duration')}
        </button>
    `;

    sortMenu.querySelectorAll(".sort-option").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const sortType = btn.dataset.sort;
            if (currentSortType === sortType) {
                currentSortDirection = currentSortDirection === "asc" ? "desc" : "asc";
            } else {
                currentSortType = sortType;
                currentSortDirection = "asc";
            }
            updateSortMenu();
            applySorting();
            closeSortMenu();
        };
    });
}

function applySorting() {
    const playlist = qs("playlist");
    if (!playlist) return;

    const items = Array.from(playlist.querySelectorAll(".track-item"));
    if (items.length === 0) return;

    const tracksData = items.map(item => ({
        element: item,
        id: item.dataset.id || "",
        name: item.querySelector(".track-item-name")?.textContent || "",
        artist: item.querySelector(".track-item-artist")?.textContent || "",
        duration: item.querySelector(".track-duration")?.textContent || "0:00",
        addedAt: item.dataset.addedAt || new Date().toISOString()
    }));

    const sorted = sortTracks(tracksData, currentSortType, currentSortDirection);

    sorted.forEach((track, index) => {
        if (track.element) {
            playlist.appendChild(track.element);
            const numberEl = track.element.querySelector(".track-number");
            if (numberEl) {
                numberEl.textContent = index + 1;
            }
        }
    });
}

function toggleSortMenu() {
    const sortMenu = qs("sortMenu");
    if (sortMenu) sortMenu.classList.toggle("hidden");
}

function closeSortMenu() {
    const sortMenu = qs("sortMenu");
    if (sortMenu) sortMenu.classList.add("hidden");
}

// ===== TOGGLE LIKE =====
function toggleLike(trackId, button) {
    if (!trackId) return;

    const heartEl = button?.querySelector(".heart-icon, .heart-small");
    const t = texts[lang];

    if (favorites.has(trackId)) {
        favorites.delete(trackId);
        if (button) button.classList.remove("liked");
        if (heartEl) heartEl.textContent = "♡";
        showToast(t.removedFromFavorites, "error");
    } else {
        favorites.add(trackId);
        if (button) button.classList.add("liked");
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
    if (!trackId) return;

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
    if (!list) return;

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

        const name = trackEl?.querySelector(".track-item-name, .recent-name")?.textContent || "Track";
        const artist = trackEl?.querySelector(".track-item-artist, .recent-artist")?.textContent || "Artist";

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
    });

    list.querySelectorAll(".like-btn-small").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            if (id) toggleLike(id, btn);
        };
    });
}

// ===== TOGGLE DOWNLOAD =====
function toggleDownload(trackId) {
    if (!trackId) return;

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
    if (!list) return;

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

        const name = trackEl?.querySelector(".track-item-name, .recent-name")?.textContent || "Track";
        const artist = trackEl?.querySelector(".track-item-artist, .recent-artist")?.textContent || "Artist";

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
    });
}

// ===== CREATE PLAYLIST MODAL =====
function openCreatePlaylistModal() {
    const modal = qs("createPlaylistModal");
    const input = qs("playlistNameInput");

    if (modal) modal.classList.remove("hidden");
    if (input) {
        input.value = "";
        input.focus();
    }

    selectedIcon = "🎵";
    qsa(".icon-option").forEach(opt => {
        opt.classList.toggle("selected", opt.dataset.icon === selectedIcon);
    });
}

function closeCreatePlaylistModal() {
    const modal = qs("createPlaylistModal");
    if (modal) modal.classList.add("hidden");
}

function createPlaylist() {
    const input = qs("playlistNameInput");
    const name = input?.value?.trim();

    if (!name) {
        if (input) input.focus();
        return;
    }

    const newPlaylist = {
        id: "playlist_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
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
    if (!playlistId) return;

    userPlaylists = userPlaylists.filter(p => p && p.id !== playlistId);
    saveState();
    renderUserPlaylists();

    qsa(".tab-btn, .playlist-view").forEach(el => el.classList.remove("active"));

    const tabAll = qs("tabAll");
    const viewAll = qs("viewAll");
    if (tabAll) tabAll.classList.add("active");
    if (viewAll) viewAll.classList.add("active");

    currentPlaylistId = null;
    showToast(texts[lang].playlistDeleted, "error");
}

// ===== ADD TO PLAYLIST MODAL =====
function openAddToPlaylistModal(trackId) {
    if (!trackId) return;

    currentTrackId = trackId;
    const modal = qs("addToPlaylistModal");
    const container = qs("playlistsSelect");

    if (!modal || !container) return;

    if (userPlaylists.length === 0) {
        container.innerHTML = `<p class="no-playlists-msg">${texts[lang].noPlaylists}</p>`;
    } else {
        container.innerHTML = "";
        userPlaylists.forEach(playlist => {
            if (!playlist || !playlist.id) return;

            const tracksCount = Array.isArray(playlist.tracks) ? playlist.tracks.length : 0;

            const item = document.createElement("div");
            item.className = "playlist-select-item";
            item.innerHTML = `
                <span class="playlist-icon">${safeText(playlist.icon || "🎵")}</span>
                <span class="playlist-name">${safeText(playlist.name || "Без названия")}</span>
                <span class="playlist-count">${tracksCount}</span>
            `;
            item.onclick = () => addTrackToPlaylist(playlist.id, trackId);
            container.appendChild(item);
        });
    }

    modal.classList.remove("hidden");
}

function closeAddToPlaylistModal() {
    const modal = qs("addToPlaylistModal");
    if (modal) modal.classList.add("hidden");
    currentTrackId = null;
}

function addTrackToPlaylist(playlistId, trackId) {
    if (!playlistId || !trackId) return;

    const playlist = userPlaylists.find(p => p && p.id === playlistId);
    if (!playlist) return;

    if (!Array.isArray(playlist.tracks)) {
        playlist.tracks = [];
    }

    const trackEl = document.querySelector(`.track-item[data-id="${trackId}"]`) ||
        document.querySelector(`.recent-track[data-id="${trackId}"]`);

    const trackInfo = {
        id: trackId,
        name: trackEl?.querySelector(".track-item-name, .recent-name")?.textContent || "Track",
        artist: trackEl?.querySelector(".track-item-artist, .recent-artist")?.textContent || "Artist",
        duration: trackEl?.querySelector(".track-duration")?.textContent || "3:24",
        addedAt: new Date().toISOString()
    };

    // Check if track already exists
    if (!playlist.tracks.find(t => t && t.id === trackId)) {
        playlist.tracks.push(trackInfo);
        saveState();
        renderUserPlaylists();

        if (currentPlaylistId === playlistId) {
            renderUserPlaylistTracks(playlist);
        }
    }

    closeAddToPlaylistModal();
    showToast(texts[lang].addedToPlaylist, "success");
}

// ===== PLAY BUTTON UPDATE =====
function updatePlayButton() {
    const mainBtn = qs("mainPlayBtn");
    const playPauseBtn = qs("playPauseBtn");

    const icon = isPlaying ? "⏸" : "▶";
    if (mainBtn) mainBtn.textContent = icon;
    if (playPauseBtn) playPauseBtn.textContent = icon;
}

// ===== FORMAT TIME =====
function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ===== WAVEFORM =====
function generateWaveform() {
    const waveform = qs("waveform");
    if (!waveform) return;

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

// ===== INITIALIZE EVENT LISTENERS =====
function initEventListeners() {
    // Icon picker
    qsa(".icon-option").forEach(btn => {
        btn.onclick = () => {
            selectedIcon = btn.dataset.icon || "🎵";
            qsa(".icon-option").forEach(opt => opt.classList.remove("selected"));
            btn.classList.add("selected");
        };
    });

    // Logo click
    const logo = document.querySelector(".logo");
    if (logo) {
        logo.onclick = navigateToHome;
    }

    // Navigation
    qsa(".nav-item").forEach(btn => {
        btn.onclick = () => {
            qsa(".nav-item, .view").forEach(el => el.classList.remove("active"));
            btn.classList.add("active");
            const tabId = btn.dataset.tab;
            const view = qs(tabId);
            if (view) view.classList.add("active");
            qsa(".playlist-item").forEach(el => el.classList.remove("active"));
        };
    });

    // Playlist tabs
    qsa(".tab-btn").forEach(btn => {
        btn.onclick = () => {
            qsa(".tab-btn, .playlist-view").forEach(el => el.classList.remove("active"));
            btn.classList.add("active");
            const viewName = btn.dataset.playlistView;
            if (viewName) {
                const view = qs(`view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
                if (view) view.classList.add("active");
            }
            qsa(".playlist-item").forEach(el => el.classList.remove("active"));
        };
    });

    // Sidebar playlist items
    qsa(".playlist-item[data-playlist]").forEach(item => {
        item.onclick = () => {
            qsa(".nav-item, .view").forEach(el => el.classList.remove("active"));
            const playlistsTab = document.querySelector('[data-tab="playlists"]');
            const playlistsView = qs("playlists");
            if (playlistsTab) playlistsTab.classList.add("active");
            if (playlistsView) playlistsView.classList.add("active");

            const playlistType = item.dataset.playlist;
            if (playlistType === "favorites" || playlistType === "downloaded") {
                qsa(".tab-btn, .playlist-view").forEach(el => el.classList.remove("active"));
                const tabBtn = document.querySelector(`[data-playlist-view="${playlistType}"]`);
                const view = qs(`view${playlistType.charAt(0).toUpperCase() + playlistType.slice(1)}`);
                if (tabBtn) tabBtn.classList.add("active");
                if (view) view.classList.add("active");
            }
        };
    });

    // Language toggle
    const langToggle = qs("langToggle");
    if (langToggle) {
        langToggle.onclick = () => {
            lang = lang === "ru" ? "en" : "ru";
            applyLang();
            saveState();
        };
    }

    // Theme toggle
    const themeToggle = qs("themeToggle");
    if (themeToggle) {
        themeToggle.onclick = () => {
            theme = theme === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", theme);
            const icon = themeToggle.querySelector(".theme-icon");
            if (icon) icon.textContent = theme === "dark" ? "🌙" : "☀️";
            saveState();
        };
    }

    // Sort button
    const sortBtn = qs("sortBtn");
    if (sortBtn) {
        sortBtn.onclick = (e) => {
            e.stopPropagation();
            toggleSortMenu();
        };
    }

    // Close sort menu on outside click
    document.addEventListener("click", (e) => {
        const sortMenu = qs("sortMenu");
        const sortBtnEl = qs("sortBtn");
        if (sortMenu && sortBtnEl) {
            if (!sortMenu.contains(e.target) && !sortBtnEl.contains(e.target)) {
                closeSortMenu();
            }
        }
    });

    // Load track
    const loadTrackBtn = qs("loadTrack");
    if (loadTrackBtn) {
        loadTrackBtn.onclick = () => {
            const loader = qs("loader");
            if (loader) loader.classList.remove("hidden");

            setTimeout(() => {
                if (loader) loader.classList.add("hidden");

                const trackTitle = qs("trackTitle");
                const trackArtist = qs("trackArtist");
                const audio = qs("audio");
                const player = qs("player");

                if (trackTitle) trackTitle.textContent = texts[lang].track;
                if (trackArtist) trackArtist.textContent = texts[lang].artist;
                if (audio) audio.src = "demo.mp3";
                if (player) player.classList.remove("hidden");
                if (audio) audio.play().catch(() => { });

                isPlaying = true;
                currentTrackId = "current_" + Date.now();
                updatePlayButton();
            }, 800);
        };
    }

    // Play controls
    const mainPlayBtn = qs("mainPlayBtn");
    if (mainPlayBtn) {
        mainPlayBtn.onclick = () => {
            const audio = qs("audio");
            if (!audio) return;

            if (isPlaying) {
                audio.pause();
            } else {
                audio.play().catch(() => { });
            }
            isPlaying = !isPlaying;
            updatePlayButton();
        };
    }

    const playPauseBtn = qs("playPauseBtn");
    if (playPauseBtn) {
        playPauseBtn.onclick = () => {
            const mainBtn = qs("mainPlayBtn");
            if (mainBtn) mainBtn.click();
        };
    }

    // Like button (player)
    const likeBtn = qs("likeBtn");
    if (likeBtn) {
        likeBtn.onclick = () => {
            if (currentTrackId) {
                toggleLike(currentTrackId, likeBtn);
            }
        };
    }

    // Download button
    const downloadBtn = qs("downloadBtn");
    if (downloadBtn) {
        downloadBtn.onclick = () => {
            if (currentTrackId) {
                toggleDownload(currentTrackId);
            }
        };
    }

    // Add to playlist button
    const addToPlaylistBtn = qs("addToPlaylistBtn");
    if (addToPlaylistBtn) {
        addToPlaylistBtn.onclick = () => {
            if (currentTrackId) {
                openAddToPlaylistModal(currentTrackId);
            }
        };
    }

    // Like buttons in lists
    qsa(".like-btn-small").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            if (id) toggleLike(id, btn);
        };
    });

    // Volume control
    const volumeSlider = qs("volumeSlider");
    if (volumeSlider) {
        volumeSlider.oninput = (e) => {
            const audio = qs("audio");
            const volumeIcon = qs("volumeIcon");
            if (!audio) return;

            const volume = e.target.value / 100;
            audio.volume = volume;

            if (volumeIcon) {
                if (volume === 0) volumeIcon.textContent = "🔇";
                else if (volume < 0.5) volumeIcon.textContent = "🔉";
                else volumeIcon.textContent = "🔊";
            }
        };
    }

    const volumeIcon = qs("volumeIcon");
    if (volumeIcon) {
        volumeIcon.onclick = () => {
            const audio = qs("audio");
            const slider = qs("volumeSlider");
            if (!audio || !slider) return;

            if (audio.volume > 0) {
                audio.dataset.prevVolume = audio.volume;
                audio.volume = 0;
                slider.value = 0;
                volumeIcon.textContent = "🔇";
            } else {
                audio.volume = parseFloat(audio.dataset.prevVolume) || 0.8;
                slider.value = audio.volume * 100;
                volumeIcon.textContent = "🔊";
            }
        };
    }

    // Audio progress
    const audio = qs("audio");
    if (audio) {
        audio.ontimeupdate = () => {
            const progress = (audio.currentTime / audio.duration) * 100 || 0;
            const progressFill = qs("progressFill");
            const currentTimeEl = qs("currentTime");
            const durationEl = qs("duration");

            if (progressFill) progressFill.style.width = `${progress}%`;
            if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
            if (durationEl) durationEl.textContent = formatTime(audio.duration);
        };
    }

    // Progress bar click
    const progressBar = qs("progressBar");
    if (progressBar) {
        progressBar.onclick = (e) => {
            const audio = qs("audio");
            if (!audio || !audio.duration) return;

            const rect = progressBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            audio.currentTime = pos * audio.duration;
        };
    }

    // Shuffle & Repeat
    const shuffleBtn = qs("shuffleBtn");
    if (shuffleBtn) {
        shuffleBtn.onclick = () => shuffleBtn.classList.toggle("active");
    }

    const repeatBtn = qs("repeatBtn");
    if (repeatBtn) {
        repeatBtn.onclick = () => repeatBtn.classList.toggle("active");
    }

    // Create playlist
    const addPlaylistSidebar = qs("addPlaylistSidebar");
    if (addPlaylistSidebar) {
        addPlaylistSidebar.onclick = openCreatePlaylistModal;
    }

    // Modal events
    const closeModal = qs("closeModal");
    if (closeModal) closeModal.onclick = closeCreatePlaylistModal;

    const cancelCreatePlaylist = qs("cancelCreatePlaylist");
    if (cancelCreatePlaylist) cancelCreatePlaylist.onclick = closeCreatePlaylistModal;

    const confirmCreatePlaylist = qs("confirmCreatePlaylist");
    if (confirmCreatePlaylist) confirmCreatePlaylist.onclick = createPlaylist;

    const closeAddToPlaylistModalBtn = qs("closeAddToPlaylistModal");
    if (closeAddToPlaylistModalBtn) {
        closeAddToPlaylistModalBtn.onclick = closeAddToPlaylistModal;
    }

    // Modal overlay clicks
    const createPlaylistModal = qs("createPlaylistModal");
    if (createPlaylistModal) {
        createPlaylistModal.onclick = (e) => {
            if (e.target === createPlaylistModal) closeCreatePlaylistModal();
        };
    }

    const addToPlaylistModal = qs("addToPlaylistModal");
    if (addToPlaylistModal) {
        addToPlaylistModal.onclick = (e) => {
            if (e.target === addToPlaylistModal) closeAddToPlaylistModal();
        };
    }

    // Enter key in playlist name
    const playlistNameInput = qs("playlistNameInput");
    if (playlistNameInput) {
        playlistNameInput.onkeydown = (e) => {
            if (e.key === "Enter") createPlaylist();
        };
    }

    // Delete playlist
    const deletePlaylistBtn = qs("deletePlaylistBtn");
    if (deletePlaylistBtn) {
        deletePlaylistBtn.onclick = () => {
            if (currentPlaylistId) deletePlaylist(currentPlaylistId);
        };
    }
}

// ===== ADD STYLES =====
function addStyles() {
    if (document.getElementById("app-dynamic-styles")) return;

    const style = document.createElement("style");
    style.id = "app-dynamic-styles";
    style.textContent = `
        @keyframes waveAnim {
            from { height: 10px; opacity: 0.3; }
            to { height: 48px; opacity: 0.7; }
        }

        .drag-handle {
            cursor: grab;
            color: var(--sub);
            font-size: 16px;
            padding: 0 8px;
            opacity: 0;
            transition: opacity 0.15s ease;
            user-select: none;
        }

        .drag-handle:active {
            cursor: grabbing;
        }

        .track-item:hover .drag-handle {
            opacity: 0.6;
        }

        .track-item:hover .drag-handle:hover {
            opacity: 1;
        }

        .track-item.dragging {
            opacity: 0.4 !important;
            background: var(--card-hover) !important;
            transform: scale(1.02);
            z-index: 1000;
        }

        .track-item.drag-over-top {
            border-top: 3px solid var(--accent) !important;
            padding-top: 9px;
        }

        .track-item.drag-over-bottom {
            border-bottom: 3px solid var(--accent) !important;
            padding-bottom: 9px;
        }

        .sort-menu.hidden {
            display: none;
        }
    `;
    document.head.appendChild(style);
}

// ===== INIT =====
function init() {
    try {
        loadState();
        addStyles();
        applyLang();
        updateCounts();
        renderUserPlaylists();
        initEventListeners();
        generateWaveform();
        updateSortMenu();

        // Set theme icon
        const themeToggle = qs("themeToggle");
        if (themeToggle) {
            const icon = themeToggle.querySelector(".theme-icon");
            if (icon) icon.textContent = theme === "dark" ? "🌙" : "☀️";
        }

        console.log("✅ App initialized");
    } catch (e) {
        console.error("❌ Init error:", e);
    }
}

// Start
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}