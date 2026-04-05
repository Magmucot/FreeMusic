"use strict";

// ===== CONFIGURATION =====
const API_CONFIG = Object.freeze({
    baseURL: "http://localhost:8000/api",
    timeout: 15000,

    endpoints: Object.freeze({
        auth: Object.freeze({
            register: "/auth/register",
            login: "/auth/login",
            logout: "/auth/logout",
            profile: "/auth/profile"
        }),
        tracks: Object.freeze({
            resolve: "/tracks/resolve",
            search: "/tracks/search",
            stream: (id) => `/tracks/${encodeURIComponent(id)}/stream`,
            history: "/tracks/history"
        }),
        favorites: Object.freeze({
            base: "/favorites",
            byId: (id) => `/favorites/${encodeURIComponent(id)}`,
            check: (id) => `/favorites/check/${encodeURIComponent(id)}`
        }),
        downloads: Object.freeze({
            base: "/downloads",
            byId: (id) => `/downloads/${encodeURIComponent(id)}`
        }),
        playlists: Object.freeze({
            base: "/playlists",
            byId: (id) => `/playlists/${encodeURIComponent(id)}`,
            tracks: (id) => `/playlists/${encodeURIComponent(id)}/tracks`,
            track: (pId, tId) => `/playlists/${encodeURIComponent(pId)}/tracks/${encodeURIComponent(tId)}`
        }),
        settings: "/settings"
    })
});

// ===== TOKEN MANAGEMENT =====
const TokenManager = {
    key: "authToken",

    get() {
        try {
            return localStorage.getItem(this.key);
        } catch {
            return null;
        }
    },

    set(token) {
        try {
            if (token) {
                localStorage.setItem(this.key, token);
            } else {
                localStorage.removeItem(this.key);
            }
        } catch (e) {
            console.warn("Token storage failed:", e);
        }
    },

    clear() {
        this.set(null);
    }
};

// ===== AXIOS INSTANCE =====
const apiClient = axios.create({
    baseURL: API_CONFIG.baseURL,
    timeout: API_CONFIG.timeout,
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
});

// Request Interceptor
apiClient.interceptors.request.use(
    (config) => {
        const token = TokenManager.get();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor
apiClient.interceptors.response.use(
    (response) => response.data ?? {},
    (error) => {
        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
            TokenManager.clear();
            window.dispatchEvent(new CustomEvent("auth:logout"));
        }

        // Extract error message
        const message = error.response?.data?.detail
            ?? error.response?.data?.message
            ?? error.message
            ?? "Произошла ошибка сети";

        return Promise.reject(new Error(message));
    }
);

// ===== HELPERS =====
const sanitize = (str, maxLen = 500) => {
    if (typeof str !== "string") return "";
    return str.trim().slice(0, maxLen);
};

const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof email === "string" && re.test(email) && email.length <= 254;
};

const validateId = (id) => {
    return id != null && String(id).length > 0;
};

// ===== REPOSITORIES =====

const AuthRepository = Object.freeze({
    async register(email, password, username) {
        if (!validateEmail(email)) {
            throw new Error("Неверный формат email");
        }
        if (typeof password !== "string" || password.length < 6) {
            throw new Error("Пароль должен быть минимум 6 символов");
        }
        if (typeof username !== "string" || username.trim().length < 2) {
            throw new Error("Имя должно быть минимум 2 символа");
        }

        const data = await apiClient.post(API_CONFIG.endpoints.auth.register, {
            email: sanitize(email, 254),
            password,
            username: sanitize(username, 50)
        });

        if (data?.token) TokenManager.set(data.token);
        return data;
    },

    async login(email, password) {
        if (!validateEmail(email)) {
            throw new Error("Неверный формат email");
        }
        if (!password) {
            throw new Error("Введите пароль");
        }

        const data = await apiClient.post(API_CONFIG.endpoints.auth.login, {
            email: sanitize(email, 254),
            password
        });

        if (data?.token) TokenManager.set(data.token);
        return data;
    },

    logout() {
        TokenManager.clear();
        return Promise.resolve({ success: true });
    },

    getProfile() {
        return apiClient.get(API_CONFIG.endpoints.auth.profile);
    }
});

const TracksRepository = Object.freeze({
    resolve(url) {
        const trimmed = sanitize(url, 2048);
        if (!trimmed) {
            return Promise.reject(new Error("Введите ссылку"));
        }
        return apiClient.post(API_CONFIG.endpoints.tracks.resolve, { url: trimmed });
    },

    search(query, limit = 20) {
        const q = sanitize(query, 200);
        if (!q) {
            return Promise.reject(new Error("Введите поисковый запрос"));
        }
        return apiClient.get(API_CONFIG.endpoints.tracks.search, {
            params: { q, limit: Math.min(Math.max(1, limit), 100) }
        });
    },

    getStreamUrl(trackId) {
        if (!validateId(trackId)) {
            return Promise.reject(new Error("ID трека обязателен"));
        }
        return apiClient.get(API_CONFIG.endpoints.tracks.stream(trackId));
    },

    getHistory() {
        return apiClient.get(API_CONFIG.endpoints.tracks.history);
    },

    addToHistory(trackId) {
        if (!validateId(trackId)) {
            return Promise.reject(new Error("ID трека обязателен"));
        }
        return apiClient.post(API_CONFIG.endpoints.tracks.history, {
            track_id: String(trackId)
        });
    }
});

const FavoritesRepository = Object.freeze({
    getAll() {
        return apiClient.get(API_CONFIG.endpoints.favorites.base);
    },

    add(trackId, trackData = {}) {
        if (!validateId(trackId)) {
            return Promise.reject(new Error("ID трека обязателен"));
        }
        return apiClient.post(API_CONFIG.endpoints.favorites.base, {
            track_id: String(trackId),
            title: trackData.title ? sanitize(trackData.title, 200) : undefined,
            artist: trackData.artist ? sanitize(trackData.artist, 200) : undefined,
            duration: trackData.duration ? sanitize(trackData.duration, 10) : undefined
        });
    },

    remove(trackId) {
        if (!validateId(trackId)) {
            return Promise.reject(new Error("ID трека обязателен"));
        }
        return apiClient.delete(API_CONFIG.endpoints.favorites.byId(trackId));
    },

    check(trackId) {
        if (!validateId(trackId)) {
            return Promise.reject(new Error("ID трека обязателен"));
        }
        return apiClient.get(API_CONFIG.endpoints.favorites.check(trackId));
    }
});

const DownloadsRepository = Object.freeze({
    getAll() {
        return apiClient.get(API_CONFIG.endpoints.downloads.base);
    },

    add(trackId, trackData = {}) {
        if (!validateId(trackId)) {
            return Promise.reject(new Error("ID трека обязателен"));
        }
        return apiClient.post(API_CONFIG.endpoints.downloads.base, {
            track_id: String(trackId),
            title: trackData.title ? sanitize(trackData.title, 200) : undefined,
            artist: trackData.artist ? sanitize(trackData.artist, 200) : undefined
        });
    },

    remove(trackId) {
        if (!validateId(trackId)) {
            return Promise.reject(new Error("ID трека обязателен"));
        }
        return apiClient.delete(API_CONFIG.endpoints.downloads.byId(trackId));
    }
});

const PlaylistsRepository = Object.freeze({
    getAll() {
        return apiClient.get(API_CONFIG.endpoints.playlists.base);
    },

    create(name, icon = "🎵") {
        const safeName = sanitize(name, 100);
        if (!safeName) {
            return Promise.reject(new Error("Введите название плейлиста"));
        }
        return apiClient.post(API_CONFIG.endpoints.playlists.base, {
            name: safeName,
            icon: sanitize(icon, 10) || "🎵"
        });
    },

    getById(id) {
        if (!validateId(id)) {
            return Promise.reject(new Error("ID плейлиста обязателен"));
        }
        return apiClient.get(API_CONFIG.endpoints.playlists.byId(id));
    },

    update(id, data) {
        if (!validateId(id)) {
            return Promise.reject(new Error("ID плейлиста обязателен"));
        }
        return apiClient.put(API_CONFIG.endpoints.playlists.byId(id), {
            name: data.name ? sanitize(data.name, 100) : undefined,
            icon: data.icon ? sanitize(data.icon, 10) : undefined
        });
    },

    delete(id) {
        if (!validateId(id)) {
            return Promise.reject(new Error("ID плейлиста обязателен"));
        }
        return apiClient.delete(API_CONFIG.endpoints.playlists.byId(id));
    },

    addTrack(playlistId, trackId, trackData = {}) {
        if (!validateId(playlistId) || !validateId(trackId)) {
            return Promise.reject(new Error("ID плейлиста и трека обязательны"));
        }
        return apiClient.post(API_CONFIG.endpoints.playlists.tracks(playlistId), {
            track_id: String(trackId),
            title: trackData.title ? sanitize(trackData.title, 200) : undefined,
            artist: trackData.artist ? sanitize(trackData.artist, 200) : undefined
        });
    },

    removeTrack(playlistId, trackId) {
        if (!validateId(playlistId) || !validateId(trackId)) {
            return Promise.reject(new Error("ID плейлиста и трека обязательны"));
        }
        return apiClient.delete(API_CONFIG.endpoints.playlists.track(playlistId, trackId));
    }
});

const SettingsRepository = Object.freeze({
    get() {
        return apiClient.get(API_CONFIG.endpoints.settings);
    },

    update(settings) {
        if (typeof settings !== "object" || settings === null) {
            return Promise.reject(new Error("Настройки должны быть объектом"));
        }

        const safe = {};
        if (settings.lang === "ru" || settings.lang === "en") {
            safe.lang = settings.lang;
        }
        if (settings.theme === "dark" || settings.theme === "light") {
            safe.theme = settings.theme;
        }

        return apiClient.put(API_CONFIG.endpoints.settings, safe);
    }
});

// ===== EXPORT =====
window.API = Object.freeze({
    client: apiClient,
    config: API_CONFIG,
    auth: AuthRepository,
    tracks: TracksRepository,
    favorites: FavoritesRepository,
    downloads: DownloadsRepository,
    playlists: PlaylistsRepository,
    settings: SettingsRepository
});