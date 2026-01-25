"use strict";

// ===== UTILITIES =====
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);
const safe = (str, max = 500) => typeof str === "string" ? str.replace(/[<>]/g, "").slice(0, max) : "";

// ===== LOCALIZATION =====
const T = {
    ru: {
        listenTitle: "Прослушивание", listenSubtitle: "Вставьте ссылку или название трека",
        playlistTitle: "Плейлисты", playlistSubtitle: "Добавляйте плейлисты по ссылке",
        track: "Демо-трек", artist: "Исполнитель",
        placeholderTrack: "Ссылка на трек...", placeholderPlaylist: "Ссылка на плейлист...",
        searchPlaceholder: "Поиск...", library: "Библиотека",
        favorites: "Избранное", downloaded: "Скачанные", userPlaylists: "Мои плейлисты",
        createPlaylist: "Создать плейлист", recentTitle: "Недавно прослушанные", allTracks: "Все",
        favoritesDesc: "Треки, которые понравились", downloadedDesc: "Доступны офлайн",
        emptyFavorites: "Нет избранных", emptyFavoritesHint: "Нажмите ♡",
        emptyDownloaded: "Нет скачанных", emptyDownloadedHint: "Нажмите 📥",
        emptyPlaylist: "Плейлист пуст", emptyPlaylistHint: "Добавьте треки ➕",
        addedToFavorites: "Добавлено в избранное", removedFromFavorites: "Удалено из избранного",
        addedToDownloaded: "Скачано", addedToPlaylist: "Добавлено",
        tracksCount: "треков", createPlaylistTitle: "Создать плейлист",
        playlistNameLabel: "Название", playlistIconLabel: "Иконка",
        cancel: "Отмена", create: "Создать",
        playlistCreated: "Плейлист создан", playlistDeleted: "Плейлист удалён",
        addToPlaylistTitle: "Добавить в плейлист", noPlaylists: "Нет плейлистов",
        enterPlaylistName: "Введите название",
        sortByName: "По названию", sortByArtist: "По исполнителю",
        sortByDate: "По дате", sortByDuration: "По длительности"
    },
    en: {
        listenTitle: "Listening", listenSubtitle: "Paste track link or name",
        playlistTitle: "Playlists", playlistSubtitle: "Add playlists by link",
        track: "Demo Track", artist: "Artist",
        placeholderTrack: "Track link...", placeholderPlaylist: "Playlist link...",
        searchPlaceholder: "Search...", library: "Library",
        favorites: "Favorites", downloaded: "Downloaded", userPlaylists: "My Playlists",
        createPlaylist: "Create Playlist", recentTitle: "Recently Played", allTracks: "All",
        favoritesDesc: "Tracks you liked", downloadedDesc: "Available offline",
        emptyFavorites: "No favorites", emptyFavoritesHint: "Click ♡",
        emptyDownloaded: "No downloads", emptyDownloadedHint: "Click 📥",
        emptyPlaylist: "Playlist empty", emptyPlaylistHint: "Add tracks ➕",
        addedToFavorites: "Added to favorites", removedFromFavorites: "Removed",
        addedToDownloaded: "Downloaded", addedToPlaylist: "Added",
        tracksCount: "tracks", createPlaylistTitle: "Create Playlist",
        playlistNameLabel: "Name", playlistIconLabel: "Icon",
        cancel: "Cancel", create: "Create",
        playlistCreated: "Playlist created", playlistDeleted: "Playlist deleted",
        addToPlaylistTitle: "Add to playlist", noPlaylists: "No playlists",
        enterPlaylistName: "Enter name",
        sortByName: "By name", sortByArtist: "By artist",
        sortByDate: "By date", sortByDuration: "By duration"
    }
};

// ===== STATE =====
const State = {
    lang: "ru",
    theme: "dark",
    isPlaying: false,
    favorites: new Set(),
    downloaded: new Set(),
    playlists: [],
    currentPlaylistId: null,
    currentTrackId: null,
    selectedIcon: "🎵",
    sortType: "date",
    sortDir: "desc",
    draggedEl: null,
    draggedPlaylistId: null
};

// ===== STORAGE =====
const Storage = {
    load() {
        try {
            const data = localStorage.getItem("musicApp");
            if (!data) return;
            const parsed = JSON.parse(data);
            if (parsed.favorites) State.favorites = new Set(parsed.favorites);
            if (parsed.downloaded) State.downloaded = new Set(parsed.downloaded);
            if (Array.isArray(parsed.playlists)) State.playlists = parsed.playlists;
            if (parsed.lang === "ru" || parsed.lang === "en") State.lang = parsed.lang;
            if (parsed.theme === "dark" || parsed.theme === "light") {
                State.theme = parsed.theme;
                document.documentElement.setAttribute("data-theme", State.theme);
            }
        } catch (e) {
            console.error("Load error:", e);
        }
    },
    save() {
        try {
            localStorage.setItem("musicApp", JSON.stringify({
                favorites: [...State.favorites],
                downloaded: [...State.downloaded],
                playlists: State.playlists,
                lang: State.lang,
                theme: State.theme
            }));
        } catch (e) {
            console.error("Save error:", e);
        }
    }
};

// ===== TOAST =====
function toast(msg, type = "success") {
    const c = $("toastContainer");
    if (!c) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${type === "success" ? "✓" : "✕"}</span><span class="toast-message">${safe(msg)}</span>`;
    c.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

// ===== LANG =====
function applyLang() {
    const t = T[State.lang];
    const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
    const setP = (id, val) => { const el = $(id); if (el) el.placeholder = val; };
    const setH = (id, val) => { const el = $(id); if (el) el.innerHTML = val; };

    set("listenTitle", t.listenTitle); set("listenSubtitle", t.listenSubtitle);
    set("playlistTitle", t.playlistTitle); set("playlistSubtitle", t.playlistSubtitle);
    setP("trackInput", t.placeholderTrack); setP("playlistInput", t.placeholderPlaylist);
    setP("globalSearch", t.searchPlaceholder);
    set("libraryTitle", t.library); set("favoritesName", t.favorites);
    set("downloadedName", t.downloaded); set("userPlaylistsLabel", t.userPlaylists);
    set("addPlaylistLabel", t.createPlaylist); set("recentTitle", t.recentTitle);
    set("tabAll", t.allTracks);
    setH("tabFavorites", `❤️ ${t.favorites}`); setH("tabDownloaded", `📥 ${t.downloaded}`);
    set("favoritesTitle", t.favorites); set("favoritesDesc", t.favoritesDesc);
    set("downloadedTitle", t.downloaded); set("downloadedDesc", t.downloadedDesc);
    set("emptyFavoritesText", t.emptyFavorites); set("emptyFavoritesHint", t.emptyFavoritesHint);
    set("emptyDownloadedText", t.emptyDownloaded); set("emptyDownloadedHint", t.emptyDownloadedHint);
    set("emptyUserPlaylistText", t.emptyPlaylist); set("emptyUserPlaylistHint", t.emptyPlaylistHint);
    set("modalTitle", t.createPlaylistTitle); set("labelPlaylistName", t.playlistNameLabel);
    set("labelPlaylistIcon", t.playlistIconLabel); set("cancelCreatePlaylist", t.cancel);
    set("confirmCreatePlaylist", t.create); setP("playlistNameInput", t.enterPlaylistName);
    set("addToPlaylistTitle", t.addToPlaylistTitle);

    const langBtn = $("langToggle");
    if (langBtn) langBtn.querySelector(".lang-text").textContent = State.lang === "ru" ? "EN" : "RU";
    updateSortMenu();
}

// ===== COUNTS =====
function updateCounts() {
    const f = $("favoritesCount"), d = $("downloadedCount");
    if (f) f.textContent = State.favorites.size;
    if (d) d.textContent = State.downloaded.size;
}

// ===== PLAYLISTS SIDEBAR =====
function renderPlaylists() {
    const c = $("userPlaylists");
    if (!c) return;
    c.innerHTML = "";
    State.playlists.forEach(p => {
        if (!p?.id) return;
        const el = document.createElement("div");
        el.className = "playlist-item";
        el.dataset.playlistId = p.id;
        el.innerHTML = `<span class="playlist-icon">${safe(p.icon || "🎵")}</span><span class="playlist-name">${safe(p.name || "")}</span><span class="playlist-count">${p.tracks?.length || 0}</span>`;
        el.onclick = () => openPlaylist(p.id);
        c.appendChild(el);
    });
}

// ===== NAVIGATE HOME =====
function goHome() {
    $$(".nav-item, .view").forEach(e => e.classList.remove("active"));
    document.querySelector('[data-tab="listen"]')?.classList.add("active");
    $("listen")?.classList.add("active");
    $$(".playlist-item").forEach(e => e.classList.remove("active"));
}

// ===== OPEN PLAYLIST =====
function openPlaylist(id) {
    const p = State.playlists.find(x => x?.id === id);
    if (!p) return;
    State.currentPlaylistId = id;

    $$(".nav-item, .view").forEach(e => e.classList.remove("active"));
    document.querySelector('[data-tab="playlists"]')?.classList.add("active");
    $("playlists")?.classList.add("active");
    $$(".tab-btn, .playlist-view").forEach(e => e.classList.remove("active"));
    $("viewUserPlaylist")?.classList.add("active");

    const icon = $("currentPlaylistIcon"), name = $("currentPlaylistName"), desc = $("currentPlaylistDesc");
    if (icon) icon.textContent = p.icon || "🎵";
    if (name) name.textContent = p.name || "";
    if (desc) desc.textContent = `${p.tracks?.length || 0} ${T[State.lang].tracksCount}`;

    renderPlaylistTracks(p);
    $$(".playlist-item").forEach(e => e.classList.remove("active"));
    document.querySelector(`[data-playlist-id="${id}"]`)?.classList.add("active");
}

// ===== RENDER PLAYLIST TRACKS =====
function renderPlaylistTracks(p) {
    const c = $("userPlaylistTracks");
    if (!c) return;
    const tracks = p.tracks || [];
    if (!tracks.length) {
        c.innerHTML = `<div class="empty-state"><span class="empty-icon">${safe(p.icon || "🎵")}</span><p>${T[State.lang].emptyPlaylist}</p><span class="empty-hint">${T[State.lang].emptyPlaylistHint}</span></div>`;
        return;
    }
    c.innerHTML = "";
    tracks.forEach((t, i) => {
        if (!t) return;
        const id = t.id || `t_${i}`;
        const el = document.createElement("div");
        el.className = "track-item";
        el.draggable = true;
        el.dataset.id = id;
        el.dataset.index = i;
        el.innerHTML = `
            <span class="drag-handle">⠿</span>
            <span class="track-number">${i + 1}</span>
            <div class="track-cover-small"></div>
            <div class="track-item-info"><span class="track-item-name">${safe(t.name || "")}</span><span class="track-item-artist">${safe(t.artist || "")}</span></div>
            <span class="track-duration">${safe(t.duration || "0:00")}</span>
            <button class="like-btn-small ${State.favorites.has(id) ? "liked" : ""}" data-id="${id}"><span class="heart-small">${State.favorites.has(id) ? "❤" : "♡"}</span></button>
            <button class="more-btn">⋯</button>`;
        c.appendChild(el);
    });
    c.querySelectorAll(".like-btn-small").forEach(b => b.onclick = e => { e.stopPropagation(); toggleLike(b.dataset.id, b); });
    initDrag(c, p.id);
}

// ===== DRAG & DROP =====
function initDrag(container, playlistId) {
    if (!container) return;
    container.querySelectorAll(".track-item[draggable]").forEach(item => {
        item.ondragstart = e => {
            State.draggedEl = item;
            State.draggedPlaylistId = playlistId;
            item.classList.add("dragging");
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", "");
            requestAnimationFrame(() => item.style.opacity = "0.4");
        };
        item.ondragend = () => {
            item.classList.remove("dragging");
            item.style.opacity = "";
            container.querySelectorAll(".drag-over-top, .drag-over-bottom").forEach(e => e.classList.remove("drag-over-top", "drag-over-bottom"));
            if (State.draggedPlaylistId) saveOrder(container, State.draggedPlaylistId);
            updateNumbers(container);
            State.draggedEl = null;
            State.draggedPlaylistId = null;
        };
        item.ondragover = e => {
            e.preventDefault();
            if (!State.draggedEl || State.draggedEl === item) return;
            container.querySelectorAll(".drag-over-top, .drag-over-bottom").forEach(e => e.classList.remove("drag-over-top", "drag-over-bottom"));
            const mid = item.getBoundingClientRect().top + item.offsetHeight / 2;
            item.classList.add(e.clientY < mid ? "drag-over-top" : "drag-over-bottom");
        };
        item.ondragleave = e => {
            if (!item.contains(e.relatedTarget)) item.classList.remove("drag-over-top", "drag-over-bottom");
        };
        item.ondrop = e => {
            e.preventDefault();
            if (!State.draggedEl || State.draggedEl === item) return;
            const mid = item.getBoundingClientRect().top + item.offsetHeight / 2;
            container.insertBefore(State.draggedEl, e.clientY < mid ? item : item.nextSibling);
            item.classList.remove("drag-over-top", "drag-over-bottom");
        };
    });
}

function saveOrder(container, playlistId) {
    const p = State.playlists.find(x => x?.id === playlistId);
    if (!p?.tracks) return;
    const order = [];
    container.querySelectorAll(".track-item").forEach(el => {
        const t = p.tracks.find(x => x?.id === el.dataset.id);
        if (t) order.push(t);
    });
    if (order.length === p.tracks.length) { p.tracks = order; Storage.save(); }
}

function updateNumbers(container) {
    container?.querySelectorAll(".track-item").forEach((el, i) => {
        const n = el.querySelector(".track-number");
        if (n) n.textContent = i + 1;
        el.dataset.index = i;
    });
}

// ===== SORT =====
function updateSortMenu() {
    const m = $("sortMenu"), t = T[State.lang];
    if (!m) return;
    const arrow = type => State.sortType === type ? (State.sortDir === "asc" ? " ↑" : " ↓") : "";
    m.innerHTML = `
        <button class="sort-option ${State.sortType === "name" ? "active" : ""}" data-sort="name">${t.sortByName}${arrow("name")}</button>
        <button class="sort-option ${State.sortType === "artist" ? "active" : ""}" data-sort="artist">${t.sortByArtist}${arrow("artist")}</button>
        <button class="sort-option ${State.sortType === "date" ? "active" : ""}" data-sort="date">${t.sortByDate}${arrow("date")}</button>
        <button class="sort-option ${State.sortType === "duration" ? "active" : ""}" data-sort="duration">${t.sortByDuration}${arrow("duration")}</button>`;
    m.querySelectorAll(".sort-option").forEach(b => b.onclick = e => {
        e.stopPropagation();
        const s = b.dataset.sort;
        State.sortDir = State.sortType === s ? (State.sortDir === "asc" ? "desc" : "asc") : "asc";
        State.sortType = s;
        updateSortMenu();
        applySort();
        $("sortMenu")?.classList.add("hidden");
    });
}

function applySort() {
    const list = $("playlist");
    if (!list) return;
    const items = [...list.querySelectorAll(".track-item")];
    if (!items.length) return;
    const data = items.map(el => ({
        el,
        name: el.querySelector(".track-item-name")?.textContent || "",
        artist: el.querySelector(".track-item-artist")?.textContent || "",
        duration: el.querySelector(".track-duration")?.textContent || "0:00"
    }));
    data.sort((a, b) => {
        let va, vb;
        if (State.sortType === "name") { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
        else if (State.sortType === "artist") { va = a.artist.toLowerCase(); vb = b.artist.toLowerCase(); }
        else if (State.sortType === "duration") {
            const parse = s => { const p = s.split(":").map(Number); return (p[0] || 0) * 60 + (p[1] || 0); };
            va = parse(a.duration); vb = parse(b.duration);
        } else { va = 0; vb = 0; }
        const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
        return State.sortDir === "asc" ? cmp : -cmp;
    });
    data.forEach((d, i) => { list.appendChild(d.el); const n = d.el.querySelector(".track-number"); if (n) n.textContent = i + 1; });
}

// ===== LIKE =====
function toggleLike(id, btn) {
    if (!id) return;
    const heart = btn?.querySelector(".heart-icon, .heart-small");
    const t = T[State.lang];
    if (State.favorites.has(id)) {
        State.favorites.delete(id);
        btn?.classList.remove("liked");
        if (heart) heart.textContent = "♡";
        toast(t.removedFromFavorites, "error");
    } else {
        State.favorites.add(id);
        btn?.classList.add("liked");
        if (heart) heart.textContent = "❤";
        toast(t.addedToFavorites);
    }
    updateCounts();
    updateFavorites();
    syncLikes(id);
    Storage.save();
}

function syncLikes(id) {
    const liked = State.favorites.has(id);
    $$(`[data-id="${id}"]`).forEach(el => {
        const btn = el.classList.contains("like-btn-small") ? el : el.querySelector(".like-btn-small");
        if (!btn) return;
        const h = btn.querySelector(".heart-small");
        btn.classList.toggle("liked", liked);
        if (h) h.textContent = liked ? "❤" : "♡";
    });
}

// ===== UPDATE LISTS =====
function updateFavorites() {
    const list = $("favoritesList"), t = T[State.lang];
    if (!list) return;
    if (!State.favorites.size) {
        list.innerHTML = `<div class="empty-state"><span class="empty-icon">💔</span><p>${t.emptyFavorites}</p><span class="empty-hint">${t.emptyFavoritesHint}</span></div>`;
        return;
    }
    list.innerHTML = "";
    let i = 1;
    State.favorites.forEach(id => {
        const src = document.querySelector(`.track-item[data-id="${id}"], .recent-track[data-id="${id}"]`);
        const name = src?.querySelector(".track-item-name, .recent-name")?.textContent || "Track";
        const artist = src?.querySelector(".track-item-artist, .recent-artist")?.textContent || "Artist";
        const el = document.createElement("div");
        el.className = "track-item";
        el.dataset.id = id;
        el.innerHTML = `<span class="track-number">${i++}</span><div class="track-cover-small"></div><div class="track-item-info"><span class="track-item-name">${safe(name)}</span><span class="track-item-artist">${safe(artist)}</span></div><span class="track-duration">3:24</span><button class="like-btn-small liked" data-id="${id}"><span class="heart-small">❤</span></button><button class="more-btn">⋯</button>`;
        list.appendChild(el);
    });
    list.querySelectorAll(".like-btn-small").forEach(b => b.onclick = e => { e.stopPropagation(); toggleLike(b.dataset.id, b); });
}

function updateDownloaded() {
    const list = $("downloadedList"), t = T[State.lang];
    if (!list) return;
    if (!State.downloaded.size) {
        list.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span><p>${t.emptyDownloaded}</p><span class="empty-hint">${t.emptyDownloadedHint}</span></div>`;
        return;
    }
    list.innerHTML = "";
    let i = 1;
    State.downloaded.forEach(id => {
        const src = document.querySelector(`.track-item[data-id="${id}"], .recent-track[data-id="${id}"]`);
        const name = src?.querySelector(".track-item-name, .recent-name")?.textContent || "Track";
        const artist = src?.querySelector(".track-item-artist, .recent-artist")?.textContent || "Artist";
        const el = document.createElement("div");
        el.className = "track-item";
        el.dataset.id = id;
        el.innerHTML = `<span class="track-number">${i++}</span><div class="track-cover-small"></div><div class="track-item-info"><span class="track-item-name">${safe(name)}</span><span class="track-item-artist">${safe(artist)}</span></div><span class="track-duration">3:24</span><span class="downloaded-badge">📥</span><button class="more-btn">⋯</button>`;
        list.appendChild(el);
    });
}

// ===== MODALS =====
function openCreateModal() {
    $("createPlaylistModal")?.classList.remove("hidden");
    const input = $("playlistNameInput");
    if (input) { input.value = ""; input.focus(); }
    State.selectedIcon = "🎵";
    $$(".icon-option").forEach(o => {
        const sel = o.dataset.icon === State.selectedIcon;
        o.classList.toggle("selected", sel);
        o.setAttribute("aria-checked", sel);
    });
}

function closeCreateModal() { $("createPlaylistModal")?.classList.add("hidden"); }

function createPlaylist() {
    const name = $("playlistNameInput")?.value?.trim();
    if (!name) return $("playlistNameInput")?.focus();
    State.playlists.push({
        id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        name, icon: State.selectedIcon, tracks: [], createdAt: new Date().toISOString()
    });
    Storage.save();
    renderPlaylists();
    closeCreateModal();
    toast(T[State.lang].playlistCreated);
}

function deletePlaylist(id) {
    if (!id) return;
    State.playlists = State.playlists.filter(p => p?.id !== id);
    Storage.save();
    renderPlaylists();
    $$(".tab-btn, .playlist-view").forEach(e => e.classList.remove("active"));
    $("tabAll")?.classList.add("active");
    $("viewAll")?.classList.add("active");
    State.currentPlaylistId = null;
    toast(T[State.lang].playlistDeleted, "error");
}

function openAddToModal(trackId) {
    if (!trackId) return;
    State.currentTrackId = trackId;
    const modal = $("addToPlaylistModal"), sel = $("playlistsSelect");
    if (!modal || !sel) return;
    if (!State.playlists.length) {
        sel.innerHTML = `<p class="no-playlists-msg">${T[State.lang].noPlaylists}</p>`;
    } else {
        sel.innerHTML = "";
        State.playlists.forEach(p => {
            if (!p?.id) return;
            const el = document.createElement("div");
            el.className = "playlist-select-item";
            el.innerHTML = `<span class="playlist-icon">${safe(p.icon || "🎵")}</span><span class="playlist-name">${safe(p.name || "")}</span><span class="playlist-count">${p.tracks?.length || 0}</span>`;
            el.onclick = () => addToPlaylist(p.id, trackId);
            sel.appendChild(el);
        });
    }
    modal.classList.remove("hidden");
}

function closeAddToModal() { $("addToPlaylistModal")?.classList.add("hidden"); State.currentTrackId = null; }

function addToPlaylist(playlistId, trackId) {
    const p = State.playlists.find(x => x?.id === playlistId);
    if (!p) return;
    if (!p.tracks) p.tracks = [];
    const src = document.querySelector(`.track-item[data-id="${trackId}"], .recent-track[data-id="${trackId}"]`);
    const info = {
        id: trackId,
        name: src?.querySelector(".track-item-name, .recent-name")?.textContent || "Track",
        artist: src?.querySelector(".track-item-artist, .recent-artist")?.textContent || "Artist",
        duration: src?.querySelector(".track-duration")?.textContent || "3:24",
        addedAt: new Date().toISOString()
    };
    if (!p.tracks.find(t => t?.id === trackId)) {
        p.tracks.push(info);
        Storage.save();
        renderPlaylists();
        if (State.currentPlaylistId === playlistId) renderPlaylistTracks(p);
    }
    closeAddToModal();
    toast(T[State.lang].addedToPlaylist);
}

// ===== PLAYER =====
function updatePlayBtn() {
    const m = $("mainPlayBtn"), p = $("playPauseBtn");
    const icon = State.isPlaying ? "⏸" : "▶";
    if (m) m.textContent = icon;
    if (p) p.textContent = icon;
}

function formatTime(s) {
    if (!isFinite(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

// ===== WAVEFORM =====
function genWaveform() {
    const w = $("waveform");
    if (!w) return;
    w.innerHTML = "";
    for (let i = 0; i < 50; i++) {
        const bar = document.createElement("div");
        bar.style.cssText = `display:inline-block;width:3px;background:var(--accent);border-radius:2px;height:${20 + Math.random() * 28}px;animation:wave ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate;animation-delay:${Math.random() * 0.5}s`;
        w.appendChild(bar);
    }
}

// ===== INIT =====
function init() {
    // Add wave animation
    if (!document.getElementById("appStyles")) {
        const s = document.createElement("style");
        s.id = "appStyles";
        s.textContent = `@keyframes wave{from{height:10px;opacity:.3}to{height:48px;opacity:.7}}`;
        document.head.appendChild(s);
    }

    Storage.load();
    applyLang();
    updateCounts();
    renderPlaylists();
    genWaveform();
    updateSortMenu();

    const theme = $("themeToggle");
    if (theme) theme.querySelector(".theme-icon").textContent = State.theme === "dark" ? "🌙" : "☀️";

    // Icon picker
    $$(".icon-option").forEach(b => b.onclick = () => {
        State.selectedIcon = b.dataset.icon || "🎵";
        $$(".icon-option").forEach(o => { o.classList.remove("selected"); o.setAttribute("aria-checked", "false"); });
        b.classList.add("selected");
        b.setAttribute("aria-checked", "true");
    });

    // Logo
    document.querySelector(".logo")?.addEventListener("click", goHome);

    // Nav
    $$(".nav-item").forEach(b => b.onclick = () => {
        $$(".nav-item, .view").forEach(e => e.classList.remove("active"));
        b.classList.add("active");
        $(b.dataset.tab)?.classList.add("active");
        $$(".playlist-item").forEach(e => e.classList.remove("active"));
    });

    // Tabs
    $$(".tab-btn").forEach(b => b.onclick = () => {
        $$(".tab-btn, .playlist-view").forEach(e => e.classList.remove("active"));
        b.classList.add("active");
        b.setAttribute("aria-selected", "true");
        $$(".tab-btn").forEach(x => { if (x !== b) x.setAttribute("aria-selected", "false"); });
        const v = b.dataset.playlistView;
        if (v) $(`view${v[0].toUpperCase() + v.slice(1)}`)?.classList.add("active");
        $$(".playlist-item").forEach(e => e.classList.remove("active"));
    });

    // System playlists
    $$(".playlist-item[data-playlist]").forEach(el => el.onclick = () => {
        $$(".nav-item, .view").forEach(e => e.classList.remove("active"));
        document.querySelector('[data-tab="playlists"]')?.classList.add("active");
        $("playlists")?.classList.add("active");
        const type = el.dataset.playlist;
        if (type === "favorites" || type === "downloaded") {
            $$(".tab-btn, .playlist-view").forEach(e => e.classList.remove("active"));
            document.querySelector(`[data-playlist-view="${type}"]`)?.classList.add("active");
            $(`view${type[0].toUpperCase() + type.slice(1)}`)?.classList.add("active");
        }
    });

    // Lang/Theme
    $("langToggle")?.addEventListener("click", () => { State.lang = State.lang === "ru" ? "en" : "ru"; applyLang(); Storage.save(); });
    $("themeToggle")?.addEventListener("click", () => {
        State.theme = State.theme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", State.theme);
        $("themeToggle").querySelector(".theme-icon").textContent = State.theme === "dark" ? "🌙" : "☀️";
        Storage.save();
    });

    // Sort
    $("sortBtn")?.addEventListener("click", e => { e.stopPropagation(); $("sortMenu")?.classList.toggle("hidden"); });
    document.addEventListener("click", e => { if (!$("sortMenu")?.contains(e.target) && e.target !== $("sortBtn")) $("sortMenu")?.classList.add("hidden"); });

    // Load track
    $("loadTrack")?.addEventListener("click", () => {
        $("loader")?.classList.remove("hidden");
        setTimeout(() => {
            $("loader")?.classList.add("hidden");
            $("trackTitle").textContent = T[State.lang].track;
            $("trackArtist").textContent = T[State.lang].artist;
            $("audio").src = "demo.mp3";
            $("player")?.classList.remove("hidden");
            $("audio")?.play().catch(() => { });
            State.isPlaying = true;
            State.currentTrackId = `track_${Date.now()}`;
            updatePlayBtn();
        }, 800);
    });

    // Play controls
    $("mainPlayBtn")?.addEventListener("click", () => {
        const a = $("audio");
        if (!a) return;
        State.isPlaying ? a.pause() : a.play().catch(() => { });
        State.isPlaying = !State.isPlaying;
        updatePlayBtn();
    });
    $("playPauseBtn")?.addEventListener("click", () => $("mainPlayBtn")?.click());

    // Player buttons
    $("likeBtn")?.addEventListener("click", () => { if (State.currentTrackId) toggleLike(State.currentTrackId, $("likeBtn")); });
    $("downloadBtn")?.addEventListener("click", () => {
        if (!State.currentTrackId || State.downloaded.has(State.currentTrackId)) return;
        State.downloaded.add(State.currentTrackId);
        updateCounts();
        updateDownloaded();
        Storage.save();
        toast(T[State.lang].addedToDownloaded);
    });
    $("addToPlaylistBtn")?.addEventListener("click", () => { if (State.currentTrackId) openAddToModal(State.currentTrackId); });

    // Like buttons
    $$(".like-btn-small").forEach(b => b.onclick = e => { e.stopPropagation(); toggleLike(b.dataset.id, b); });

    // Volume
    $("volumeSlider")?.addEventListener("input", e => {
        const a = $("audio"), v = e.target.value / 100;
        if (a) a.volume = v;
        const i = $("volumeIcon");
        if (i) i.textContent = v === 0 ? "🔇" : v < 0.5 ? "🔉" : "🔊";
    });
    $("volumeIcon")?.addEventListener("click", () => {
        const a = $("audio"), s = $("volumeSlider"), i = $("volumeIcon");
        if (!a || !s) return;
        if (a.volume > 0) { a.dataset.prev = a.volume; a.volume = 0; s.value = 0; i.textContent = "🔇"; }
        else { a.volume = parseFloat(a.dataset.prev) || 0.8; s.value = a.volume * 100; i.textContent = "🔊"; }
    });

    // Progress
    $("audio")?.addEventListener("timeupdate", () => {
        const a = $("audio"), p = (a.currentTime / a.duration) * 100 || 0;
        $("progressFill").style.width = `${p}%`;
        $("currentTime").textContent = formatTime(a.currentTime);
        $("duration").textContent = formatTime(a.duration);
    });
    $("progressBar")?.addEventListener("click", e => {
        const a = $("audio"), bar = $("progressBar");
        if (!a?.duration) return;
        a.currentTime = ((e.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth) * a.duration;
    });

    // Shuffle/Repeat
    $("shuffleBtn")?.addEventListener("click", () => $("shuffleBtn").classList.toggle("active"));
    $("repeatBtn")?.addEventListener("click", () => $("repeatBtn").classList.toggle("active"));

    // Create playlist
    $("addPlaylistSidebar")?.addEventListener("click", openCreateModal);
    $("closeModal")?.addEventListener("click", closeCreateModal);
    $("cancelCreatePlaylist")?.addEventListener("click", closeCreateModal);
    $("confirmCreatePlaylist")?.addEventListener("click", createPlaylist);
    $("createPlaylistModal")?.addEventListener("click", e => { if (e.target === $("createPlaylistModal")) closeCreateModal(); });
    $("playlistNameInput")?.addEventListener("keydown", e => { if (e.key === "Enter") createPlaylist(); });

    // Add to playlist
    $("closeAddToPlaylistModal")?.addEventListener("click", closeAddToModal);
    $("addToPlaylistModal")?.addEventListener("click", e => { if (e.target === $("addToPlaylistModal")) closeAddToModal(); });

    // Delete playlist
    $("deletePlaylistBtn")?.addEventListener("click", () => { if (State.currentPlaylistId) deletePlaylist(State.currentPlaylistId); });

    console.log("✅ App initialized");
}

// Start
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();