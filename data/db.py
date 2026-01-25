import sqlite3
import logging as log
from pathlib import Path


class DB:
    def __init__(self, db_n="music_lib.db"):
        base_path = Path(__file__).resolve().parent
        self.db_path = base_path / db_n

        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS songs (
                        id TEXT PRIMARY KEY,
                        title TEXT NOT NULL
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS metadata (
                        song_id TEXT PRIMARY KEY,
                        uploader TEXT,
                        duration INTEGER,
                        views INTEGER,
                        url TEXT,
                        platform TEXT,
                        FOREIGN KEY (song_id) REFERENCES songs (id)
                    )
                """)
                conn.commit()
                log.info("Схема базы данных проверена/инициализирована.")
        except sqlite3.Error as e:
            log.error(f"Ошибка при инициализации БД: {e}")

    def save_data(self, info) -> None:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            cursor.execute("INSERT OR IGNORE INTO songs (id, title) VALUES (?, ?)", (info["id"], info["title"]))

            cursor.execute(
                "INSERT OR IGNORE INTO metadata (song_id, uploader, duration, views, url, platform) VALUES (?, ?, ?, ?, ?, ?)",
                (
                    info["id"],
                    info.get("uploader"),
                    info.get("duration"),
                    info.get("view_count"),
                    info.get("webpage_url"),
                    "youtube",
                ),
            )
            conn.commit()
