import yt_dlp
from pathlib import Path
import sqlite3
import logging as log
from data.db import DB


log.basicConfig(
    level=log.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[log.FileHandler("app.log", encoding="utf-8"), log.StreamHandler()],
)


class Youtube_download:
    def __init__(self, db_n: str = "music_lib.db", folder_n: str = "songs"):
        base_path = Path(__file__).resolve().parent.parent / "data"

        self.out_path = base_path / folder_n
        self.out_path.mkdir(parents=True, exist_ok=True)

        self.db_path = base_path / db_n
        log.info(self.db_path)
        if not self.db_path.exists():
            log.info(f"Создание новой базы данных по адресу: {self.db_path}")
        self.db = DB(db_n)

    def download_audio(self, url_query: str, post_proc: bool = False, codec: str = "mp3", qual: str = "192") -> None:
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
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(query, download=True)

            # Если это был поиск, берем первый результат из списка
            if "entries" in info_dict:
                info_dict = info_dict["entries"][0]

            # 2. Сохраняем данные в БД
            if info_dict:
                self.db.save_data(info_dict)
                print(f"Успешно сохранено в БД: {info_dict['title']}")


# Пример использования
if __name__ == "__main__":
    yt_d = Youtube_download()
    video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # замените на свою
    yt_d.download_audio(video_url)

    song_name = "Never Gonna Give You Up Rick Astley"
    yt_d.download_audio(song_name)
