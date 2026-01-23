const texts = {
    ru: {
        listen: "Прослушивание",
        playlists: "Плейлисты",
        listenTitle: "Прослушивание трека",
        listenSubtitle: "Вставьте ссылку на трек",
        playlistTitle: "Плейлисты",
        playlistSubtitle: "Добавьте плейлист по ссылке",
        track: "Демо-трек",
        artist: "Исполнитель"
    },
    en: {
        listen: "Listen",
        playlists: "Playlists",
        listenTitle: "Track playback",
        listenSubtitle: "Paste a track link",
        playlistTitle: "Playlists",
        playlistSubtitle: "Add playlist by link",
        track: "Demo Track",
        artist: "Artist"
    }
};

let lang = "ru";
let theme = "dark";

const qs = id => document.getElementById(id);

function applyLang() {
    const t = texts[lang];
    qs("tabListen").textContent = t.listen;
    qs("tabPlaylists").textContent = t.playlists;
    qs("listenTitle").textContent = t.listenTitle;
    qs("listenSubtitle").textContent = t.listenSubtitle;
    qs("playlistTitle").textContent = t.playlistTitle;
    qs("playlistSubtitle").textContent = t.playlistSubtitle;
}

document.getElementById("langToggle").onclick = () => {
    lang = lang === "ru" ? "en" : "ru";
    applyLang();
};

document.getElementById("themeToggle").onclick = () => {
    theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
};

document.querySelectorAll(".tab").forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll(".tab, .tab-content")
            .forEach(el => el.classList.remove("active"));

        tab.classList.add("active");
        document.getElementById(tab.dataset.tab).classList.add("active");
    };
});

qs("loadTrack").onclick = () => {
    qs("trackTitle").textContent = texts[lang].track;
    qs("trackArtist").textContent = texts[lang].artist;
    qs("audio").src = "demo.mp3";
    qs("player").classList.remove("hidden");
    qs("audio").play();
};

applyLang();
