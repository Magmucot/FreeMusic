from concurrent.futures import ThreadPoolExecutor
import logging as log
import re
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(root_dir))

from data.db import DBManager, TrackModel
from backend.downloader import BaseDownloader
from backend.spotify import SpotifyDownloader
from backend.youtube import YoutubeDownloader

log.basicConfig(
    level=log.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[log.FileHandler("app.log", encoding="utf-8"), log.StreamHandler()],
)

logger = log.getLogger(__name__)


class MusicApp:
    def __init__(self):
        # 1. Инициализируем базу данных
        self.db = DBManager("sqlite:///music_lib.db")

        # 2. Инициализируем загрузчики
        self._yt_loader = YoutubeDownloader()
        self._sp_loader = SpotifyDownloader()

        # 3. КАРТА ЗАГРУЗЧИКОВ
        self.loaders_map = {
            re.compile(r"https?://(open\.)?spotify\.com/.*"): self._sp_loader,
            re.compile(r"https?://(www\.)?(youtube\.com|youtu\.be)/.*"): self._yt_loader,
            re.compile(r"https?://(soundcloud\.com)/.*"): self._yt_loader,
        }

        self.default_loader = self._yt_loader

    def _get_loader(self, url: str) -> BaseDownloader:
        """Определяет загрузчик для URL"""
        for pattern, loader in self.loaders_map.items():
            if pattern.search(url):
                logger.info(f"Определен загрузчик для: {url}")
                return loader

        logger.warning(f"Паттерн не найден для {url}, используем YouTube Search")
        return self.default_loader

    def process_link(self, url: str):
        """Основной метод обработки URL"""
        logger.info(f"Начало обработки: {url}")

        try:
            # 1. Определяем загрузчик
            loader = self._get_loader(url)

            # 2. Скачивание
            track_data = loader.process_url(url)

            # 3. Сохранение в БД
            if track_data:
                if isinstance(track_data, list):
                    for track in track_data:
                        self.db.save_track(track)
                    logger.info(f"Сохранено {len(track_data)} треков из: {url}")
                else:
                    self.db.save_track(track_data)
                    logger.info(f"Сохранен трек: {track_data.title}")
            else:
                logger.warning(f"Не удалось скачать: {url}")

        except Exception as e:
            logger.error(f"Критическая ошибка при обработке {url}: {e}")


# --- Запуск ---
if __name__ == "__main__":
    app = MusicApp()

    urls = [
        "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",  # Spotify трек
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",  # YouTube видео
        "Never Gonna Give You Up",  # Поиск в YouTube
    ]

    # Запускаем в потоках
    with ThreadPoolExecutor(max_workers=3) as executor:
        executor.map(app.process_link, urls)

    # Проверка результатов
    print("\n--- Результат в БД ---")
    for track in app.db.get_all_tracks():
        print(f"[{track.platform}] {track.title} -> {track.filepath}")
