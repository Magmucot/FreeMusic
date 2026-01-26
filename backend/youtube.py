import yt_dlp
import sys
import asyncio
import functools
from pathlib import Path
import logging as log

root_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(root_dir))
from data.db import DBManager, TrackModel


log.basicConfig(
    level=log.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[log.FileHandler("log/youtube.log", encoding="utf-8"), log.StreamHandler()],
)
logr = log.getLogger(__name__)


class YoutubeDownloader:
    def __init__(self, db_n: str = "music_lib.db", folder_n: str = "songs"):
        base_path = root_dir / "data"
        self.out_path = base_path / folder_n
        self.out_path.mkdir(parents=True, exist_ok=True)

        self.db_path = base_path / db_n
        logr.info(f"DB Path: {self.db_path}")
        self.db = DBManager(f"sqlite:///data/{db_n}")

    def _sync_download(self, query: str, ydl_opts: dict):
        """Внутренний синхронный метод для работы с yt_dlp"""
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(query, download=True)
            if info_dict and "entries" in info_dict:
                return info_dict["entries"][0]
            return info_dict

    def _extract_data(self, info_dict: dict, codec: str) -> dict:
        """
        Фильтрует 'грязный' словарь yt_dlp и приводит его к виду TrackModel.
        """
        # Определяем путь к файлу.
        # yt_dlp может вернуть 'requested_downloads', где лежит точный путь после конвертации
        filepath = None
        if "requested_downloads" in info_dict:
            filepath = info_dict["requested_downloads"][0].get("filepath")

        # Если не нашли, пытаемся угадать (для простых случаев)
        if not filepath and "filename" in info_dict:
            filepath = info_dict["filename"]

        return {
            "id": info_dict.get("id"),
            "title": info_dict.get("title"),
            "uploader": info_dict.get("uploader"),
            "duration": info_dict.get("duration", 0),
            "url": info_dict.get("webpage_url"),  # Важно: маппинг webpage_url -> url
            "platform": info_dict.get("extractor_key", "YouTube"),  # Маппинг extractor_key -> platform
            "filepath": filepath,
            # created_at заполнится сам (default=datetime.now)
        }

    async def download_audio(
        self, url_query: str, post_proc: bool = False, codec: str = "mp3", qual: str = "192"
    ) -> None:
        search: bool = not url_query.startswith(("http://", "https://"))
        query = f"ytsearch:{url_query}" if search else url_query

        proc = []
        if post_proc:
            proc.append(
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": codec,
                    "preferredquality": qual,
                }
            )

        ydl_opts = {
            "format": "bestaudio/best",
            "postprocessors": proc,
            "outtmpl": f"{self.out_path}/%(title)s.%(ext)s",
            "ignoreerrors": True,
            "quiet": False,
            "default_search": "ytsearch",
            "noplaylist": True,  # Обычно лучше скачивать по одному треку для поиска
        }

        loop = asyncio.get_running_loop()

        try:
            # 1. Скачиваем (в отдельном потоке)
            info_dict = await loop.run_in_executor(None, functools.partial(self._sync_download, query, ydl_opts))

            if info_dict:
                # 2. Подготавливаем чистые данные для модели
                clean_data = self._extract_data(info_dict, codec)

                # 3. Создаем объект модели
                track = TrackModel(**clean_data)

                # 4. Сохраняем в БД (также в executor, если db.save_data синхронная)
                await loop.run_in_executor(None, self.db.save_data, track)

                logr.info(f"Успешно сохранено в БД: {clean_data['title']}")

        except Exception as e:
            logr.error(f"Ошибка при обработке {url_query}: {e}")
            # Можно добавить raise e, если нужно, чтобы asyncio.gather ловил ошибку


async def main():
    yt_d = YoutubeDownloader()

    # Теперь мы можем запускать несколько загрузок одновременно!
    tasks = [yt_d.download_audio("Never Gonna Give You Up Rick Astley")]

    # Ждем завершения всех задач
    await asyncio.gather(*tasks)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
