import re
import json
import asyncio
import base64
import logging as log
import sys
from pathlib import Path
from dataclasses import dataclass
from typing import Optional, Union

# Новые асинхронные библиотеки
import aiohttp
import aiofiles
from playwright.async_api import async_playwright, Page, Browser, BrowserContext, TimeoutError as PlaywrightTimeout

# Убираем лишний импорт БД, если он не нужен для демо
# from data.db import DBManager

# Настройка логирования
log.basicConfig(
    level=log.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[log.FileHandler("log/spotify_async.log", encoding="utf-8"), log.StreamHandler()],
)
logr = log.getLogger(__name__)


@dataclass
class TrackMetadata:
    """Метаданные трека"""

    name: str
    artists: list[str]
    album: str = ""
    duration: str = ""

    @property
    def artist(self) -> str:
        return self.artists[0] if self.artists else "Unknown Artist"


@dataclass
class DownloadResult:
    """Результат скачивания"""

    track: TrackMetadata
    audio_file: Optional[Path] = None
    cover_file: Optional[Path] = None
    success: bool = False
    error: Optional[str] = None


class SpotifyParser:
    """Асинхронный парсер для скачивания треков"""

    def __init__(self, cache_dir: Union[str, Path] = "./cache", headless: bool = True):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.site_url = "https://spotidown.app/en"
        self.headless = headless

        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None

        logr.info(f"Инициализирован Async SpotifyParser, кеш: {self.cache_dir}")

    async def start(self):
        """Асинхронный запуск браузера"""
        try:
            logr.info("Запуск Playwright (Async)...")

            self.playwright = await async_playwright().start()

            self.browser = await self.playwright.chromium.launch(
                headless=self.headless, args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
            )

            self.context = await self.browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            )

            self.page = await self.context.new_page()
            self.page.set_default_timeout(30000)

            await self.page.goto(self.site_url, wait_until="networkidle")

            logr.info("Браузер успешно запущен")
            return True

        except Exception as e:
            logr.error(f"Ошибка запуска: {e}")
            await self.stop()
            return False

    async def stop(self):
        """Асинхронная остановка"""
        try:
            if self.page:
                await self.page.close()
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            logr.info("Браузер остановлен")
        except Exception as e:
            logr.error(f"Ошибка остановки: {e}")

    @staticmethod
    def safe_filename(text: str, max_length: int = 100) -> str:
        text = re.sub(r'[<>:"/\\|?*]', "", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()[:max_length]

    async def download_file(self, url: str, filename: str) -> Optional[Path]:
        """
        Асинхронное скачивание файла через aiohttp
        """
        try:
            filepath = self.cache_dir / filename
            if filepath.exists():
                logr.debug(f"Файл существует: {filename}")
                return filepath

            logr.info(f"Скачивание (Async): {filename}")

            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://spotidown.app/",
            }

            # Используем aiohttp для асинхронных запросов
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=60) as response:
                    if response.status != 200:
                        logr.error(f"Ошибка HTTP {response.status} для {filename}")
                        return None

                    # Читаем и пишем файл асинхронно
                    content = await response.read()
                    async with aiofiles.open(filepath, "wb") as f:
                        await f.write(content)

            size_mb = len(content) / 1024 / 1024
            logr.info(f"Скачан: {filename} ({size_mb:.1f} MB)")
            return filepath

        except Exception as e:
            logr.error(f"Ошибка скачивания {filename}: {e}")
            return None

    async def submit_url(self, spotify_url: str) -> bool:
        """Отправка URL"""
        try:
            await self.page.goto(self.site_url, wait_until="networkidle")

            # В Playwright async нужно использовать await для локаторов и действий
            url_input = self.page.locator("#url")
            await url_input.wait_for(state="visible")

            await url_input.fill("")
            await url_input.type(spotify_url)

            submit_btn = self.page.locator("#send")
            await submit_btn.click()

            await self.page.wait_for_selector('form[name="submitspurl"]', state="visible")
            return True

        except Exception as e:
            logr.error(f"Ошибка отправки URL: {e}")
            return False

    async def get_track_cnt(self) -> int:
        try:
            # await нужен, так как query_selector_all асинхронный
            buttons = await self.page.query_selector_all('form[name="submitspurl"] .abuttons.mb-0 button')
            return len(buttons)
        except Exception:
            return 0

    async def get_playlist_name(self) -> Optional[str]:
        try:
            name_element = await self.page.query_selector(".hover-underline")
            return await name_element.text_content() if name_element else None
        except Exception:
            return None

    async def extract_track_metadata(self, index: int) -> Optional[TrackMetadata]:
        try:
            forms = await self.page.query_selector_all('form[name="submitspurl"]')
            if index >= len(forms):
                return None

            form = forms[index]
            data_input = await form.query_selector('input[name="data"]')
            data_value = await data_input.get_attribute("value")

            data_decoded = base64.b64decode(data_value)
            track_data = json.loads(data_decoded)

            track_name = track_data.get("name", "Unknown Track")
            artist = track_data.get("artist", "Unknown Artist")
            album = track_data.get("album", "")

            artists = [a.strip() for a in artist.split(",")] if "," in artist else [artist]
            return TrackMetadata(name=track_name, artists=artists, album=album)

        except Exception as e:
            logr.error(f"Ошибка метаданных: {e}")
            return None

    async def click_track_button(self, index: int) -> bool:
        try:
            buttons = await self.page.query_selector_all('form[name="submitspurl"] .abuttons.mb-0 button')
            if index >= len(buttons):
                return False

            button = buttons[index]
            await button.scroll_into_view_if_needed()

            # Асинхронная пауза
            await asyncio.sleep(0.5)

            await button.click()
            return True
        except Exception as e:
            logr.error(f"Ошибка клика: {e}")
            return False

    async def wait_for_download_page(self) -> bool:
        try:
            await self.page.wait_for_selector(".spotidown-downloader", state="visible")
            await self.page.wait_for_selector(".spotidown-downloader-right .abuttons.mb-0 a", state="visible")
            return True
        except Exception:
            return False

    async def get_download_links(self) -> Optional[dict[str, str]]:
        try:
            links = await self.page.query_selector_all(".spotidown-downloader-right .abuttons.mb-0 a")
            if len(links) < 2:
                return None

            mp3_link = await links[0].get_attribute("href")
            cover_link = await links[1].get_attribute("href")
            return {"mp3": mp3_link, "cover": cover_link}
        except Exception:
            return None

    async def download_track(self, index: int) -> DownloadResult:
        metadata = await self.extract_track_metadata(index)
        if not metadata:
            return DownloadResult(TrackMetadata("Err", []), success=False, error="Metadata fail")

        logr.info(f"Обработка: {metadata.artist} - {metadata.name}")

        if not await self.click_track_button(index):
            return DownloadResult(metadata, success=False, error="Click fail")

        if not await self.wait_for_download_page():
            return DownloadResult(metadata, success=False, error="Page load fail")

        links = await self.get_download_links()
        if not links:
            return DownloadResult(metadata, success=False, error="No links")

        # Скачиваем файлы (можно было бы параллельно через asyncio.gather, но для простоты последовательно)
        audio_name = f"{self.safe_filename(metadata.artist)} - {self.safe_filename(metadata.name)}.mp3"
        cover_name = f"{self.safe_filename(metadata.artist)} - {self.safe_filename(metadata.name)}.jpg"

        audio_file = None
        cover_file = None

        if links.get("mp3"):
            audio_file = await self.download_file(links["mp3"], audio_name)

        if links.get("cover"):
            cover_file = await self.download_file(links["cover"], cover_name)

        success = audio_file is not None
        return DownloadResult(metadata, audio_file, cover_file, success=success)

    async def download_playlist(self, spotify_url: str, max_tracks: int = 0) -> list[DownloadResult]:
        res = []
        if not await self.submit_url(spotify_url):
            return res

        track_cnt = await self.get_track_cnt()
        playlist_name = await self.get_playlist_name()
        logr.info(f"Плейлист: {playlist_name}, треков: {track_cnt}")

        limit = track_cnt if not max_tracks else min(max_tracks, track_cnt)

        for i in range(limit):
            # Перезагружаем страницу списка, если это не первый трек
            if i > 0:
                if not await self.submit_url(spotify_url):
                    continue

            result = await self.download_track(i)
            res.append(result)

            if result.success:
                logr.info(f"✓ Готово: {result.track.name}")
            else:
                logr.error(f"✗ Ошибка: {result.error}")

            await asyncio.sleep(1)

        return res

    async def download_single_track(self, spotify_url: str) -> DownloadResult:
        if not await self.submit_url(spotify_url):
            return DownloadResult(TrackMetadata("Err", []), success=False, error="URL fail")
        return await self.download_track(0)


# === Основной блок запуска (Entry Point) ===
async def main():
    # Создаем парсер
    parser = SpotifyParser(cache_dir="./data/songs", headless=True)

    try:
        # Асинхронный старт
        if not await parser.start():
            return

        # Пример 1: Трек (используйте реальную ссылку для теста!)
        print("\n=== Тест трека ===")
        # ВАЖНО: Замените на реальную ссылку Spotify, иначе spotidown выдаст ошибку
        track_url = "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"
        result = await parser.download_single_track(track_url)
        print(f"Результат трека: {result.success}")

        # Пример 2: Плейлист
        # print("\n=== Тест плейлиста ===")
        # playlist_url = "https://open.spotify.com/playlist/..."
        # await parser.download_playlist(playlist_url, max_tracks=2)

    finally:
        await parser.stop()


if __name__ == "__main__":
    # Запускаем асинхронный цикл событий
    if sys.platform == "win32":
        # Фикс для Windows (Policy loop error)
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    asyncio.run(main())
