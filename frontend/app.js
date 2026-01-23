"use strict";

const safeText = text => text.replace(/[<>]/g, "");

const texts = {
    ru: {
        listenTitle: "Прослушивание",
        listenSubtitle: "Вставьте ссылку на трек",
        playlistTitle: "Плейлисты",
        playlistSubtitle: "Добавляйте плейлисты по ссылке",
        track: "Демо-трек",
        artist: "Исполнитель",
        placeholderTrack: "Ссылка на трек",
        placeholderPlaylist: "Ссылка на плейлист"
    },
    en: {
        listenTitle: "Listening",
        listenSubtitle: "Paste track link",
        playlistTitle: "Playlists",
        playlistSubtitle: "Add playlists by link",
        track: "Demo Track",
        artist: "Artist",
        placeholderTrack: "Track link",
        placeholderPlaylist: "Playlist link"
    }
};

let lang = "ru";
let theme = "dark";

const qs = id => document.getElementById(id);

function applyLang() {
    const t = texts[lang];
    qs("listenTitle").textContent = t.listenTitle;
    qs("listenSubtitle").textContent = t.listenSubtitle;
    qs("playlistTitle").textContent = t.playlistTitle;
    qs("playlistSubtitle").textContent = t.playlistSubtitle;
    qs("trackInput").placeholder = t.placeholderTrack;
    qs("playlistInput").placeholder = t.placeholderPlaylist;
}

document.getElementById("langToggle").onclick = () => {
    lang = lang === "ru" ? "en" : "ru";
    applyLang();
};

document.getElementById("themeToggle").onclick = () => {
    theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
};

document.querySelectorAll(".nav-item").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".nav-item, .view")
            .forEach(el => el.classList.remove("active"));
        btn.classList.add("active");
        qs(btn.dataset.tab).classList.add("active");
    };
});

qs("loadTrack").onclick = () => {
    qs("loader").classList.remove("hidden");

    setTimeout(() => {
        qs("loader").classList.add("hidden");
        qs("trackTitle").textContent = texts[lang].track;
        qs("trackArtist").textContent = texts[lang].artist;
        qs("audio").src = "demo.mp3";
        qs("player").classList.remove("hidden");
        qs("audio").play();
    }, 800);
};

applyLang();
