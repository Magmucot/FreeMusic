"use strict";

const API_BASE_URL = "http://localhost:8000/api"; // Укажи свой URL

class APIClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.token = localStorage.getItem("authToken");
    }

    setToken(token) {
        this.token = token;
        token ? localStorage.setItem("authToken", token) : localStorage.removeItem("authToken");
    }

    async request(endpoint, options = {}) {
        const headers = { "Content-Type": "application/json", ...options.headers };
        if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, { ...options, headers });

            if (response.status === 401) {
                this.setToken(null);
                window.dispatchEvent(new CustomEvent("auth:logout"));
                throw new Error("Unauthorized");
            }

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.detail || err.message || `HTTP ${response.status}`);
            }

            const text = await response.text();
            return text ? JSON.parse(text) : {};
        } catch (error) {
            console.error(`API [${endpoint}]:`, error);
            throw error;
        }
    }

    get(endpoint) { return this.request(endpoint, { method: "GET" }); }
    post(endpoint, data) { return this.request(endpoint, { method: "POST", body: JSON.stringify(data) }); }
    put(endpoint, data) { return this.request(endpoint, { method: "PUT", body: JSON.stringify(data) }); }
    delete(endpoint) { return this.request(endpoint, { method: "DELETE" }); }
}

const api = new APIClient(API_BASE_URL);

// ===== AUTH =====
const authAPI = {
    register: (email, password, username) => api.post("/auth/register", { email, password, username }).then(d => { if (d.token) api.setToken(d.token); return d; }),
    login: (email, password) => api.post("/auth/login", { email, password }).then(d => { if (d.token) api.setToken(d.token); return d; }),
    logout: () => { api.setToken(null); return Promise.resolve(); },
    getProfile: () => api.get("/auth/profile"),
};

// ===== TRACKS =====
const tracksAPI = {
    resolve: (url) => api.post("/tracks/resolve", { url }),
    search: (query, limit = 20) => api.get(`/tracks/search?q=${encodeURIComponent(query)}&limit=${limit}`),
    getStreamUrl: (trackId) => api.get(`/tracks/${trackId}/stream`),
    getHistory: () => api.get("/tracks/history"),
    addToHistory: (trackId) => api.post("/tracks/history", { track_id: trackId }),
};

// ===== FAVORITES =====
const favoritesAPI = {
    getAll: () => api.get("/favorites"),
    add: (trackId, trackData = {}) => api.post("/favorites", { track_id: trackId, ...trackData }),
    remove: (trackId) => api.delete(`/favorites/${trackId}`),
    check: (trackId) => api.get(`/favorites/check/${trackId}`),
};

// ===== DOWNLOADS =====
const downloadsAPI = {
    getAll: () => api.get("/downloads"),
    add: (trackId, trackData = {}) => api.post("/downloads", { track_id: trackId, ...trackData }),
    remove: (trackId) => api.delete(`/downloads/${trackId}`),
};

// ===== PLAYLISTS =====
const playlistsAPI = {
    getAll: () => api.get("/playlists"),
    create: (name, icon = "🎵") => api.post("/playlists", { name, icon }),
    getById: (id) => api.get(`/playlists/${id}`),
    update: (id, data) => api.put(`/playlists/${id}`, data),
    delete: (id) => api.delete(`/playlists/${id}`),
    addTrack: (playlistId, trackId, trackData = {}) => api.post(`/playlists/${playlistId}/tracks`, { track_id: trackId, ...trackData }),
    removeTrack: (playlistId, trackId) => api.delete(`/playlists/${playlistId}/tracks/${trackId}`),
};

// ===== SETTINGS =====
const settingsAPI = {
    get: () => api.get("/settings"),
    update: (settings) => api.put("/settings", settings),
};

// ===== EXPORT =====
window.API = {
    client: api,
    auth: authAPI,
    tracks: tracksAPI,
    favorites: favoritesAPI,
    downloads: downloadsAPI,
    playlists: playlistsAPI,
    settings: settingsAPI
};