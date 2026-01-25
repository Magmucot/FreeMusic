import re
import json
import time
import base64
import requests
from pathlib import Path
from typing import Dict, List, Optional, Union
from dataclasses import dataclass
import logging as log

from playwright.sync_api import sync_playwright, Page, Browser, BrowserContext, TimeoutError as PlaywrightTimeout

# Настройка логирования
log.basicConfig(level=log.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = log.getLogger(__name__)


@dataclass
class TrackMetadata:
    """Метаданные трека"""

    name: str
    artists: List[str]
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
    """Парсер для скачивания треков с Spotify через spotidown.app"""

    def __init__(self, cache_dir: Union[str, Path] = "./cache", headless: bool = True):
        """
        Инициализация парсера

        Args:
            cache_dir: Директория для кеширования файлов
            headless: Запускать браузер в фоновом режиме
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self.site_url = "https://spotidown.app/en"
        self.headless = headless
        
        # Playwright объекты
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None

        logger.info(f"Инициализирован SpotifyParser, кеш: {self.cache_dir}")

    def start(self):
        """Запуск браузера"""
        try:
            logger.info("Запуск Playwright браузера...")
            
            # Запускаем Playwright
            self.playwright = sync_playwright().start()
            
            # Запускаем браузер (Chromium по умолчанию)
            self.browser = self.playwright.chromium.launch(
                headless=self.headless,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                ]
            )
            
            # Создаем контекст с настройками
            self.context = self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                locale='en-US',
            )
            
            # Создаем страницу
            self.page = self.context.new_page()
            
            # Устанавливаем таймауты
            self.page.set_default_timeout(30000)  # 30 секунд
            
            # Открываем главную страницу
            self.page.goto(self.site_url, wait_until='networkidle')
            
            logger.info("Браузер успешно запущен")
            return True
            
        except Exception as e:
            logger.error(f"Ошибка запуска браузера: {e}")
            self.stop()
            return False

    def stop(self):
        """Остановка браузера"""
        try:
            if self.page:
                self.page.close()
                self.page = None
            
            if self.context:
                self.context.close()
                self.context = None
            
            if self.browser:
                self.browser.close()
                self.browser = None
            
            if self.playwright:
                self.playwright.stop()
                self.playwright = None
            
            logger.info("Браузер остановлен")
            
        except Exception as e:
            logger.error(f"Ошибка при остановке браузера: {e}")

    def is_running(self) -> bool:
        """Проверка, запущен ли браузер"""
        return self.page is not None and not self.page.is_closed()

    @staticmethod
    def safe_filename(text: str, max_length: int = 100) -> str:
        """
        Создание безопасного имени файла

        Args:
            text: Исходный текст
            max_length: Максимальная длина

        Returns:
            Безопасное имя файла
        """
        # Удаляем недопустимые символы
        text = re.sub(r'[<>:"/\\|?*]', "", text)
        # Заменяем несколько пробелов на один
        text = re.sub(r"\s+", " ", text)
        # Обрезаем до максимальной длины
        return text.strip()[:max_length]

    def download_file(self, url: str, filename: str) -> Optional[Path]:
        """
        Скачивание файла

        Args:
            url: URL файла
            filename: Имя файла для сохранения

        Returns:
            Путь к скачанному файлу или None при ошибке
        """
        try:
            filepath = self.cache_dir / filename

            # Если файл уже существует, возвращаем его
            if filepath.exists():
                logger.debug(f"Файл уже существует: {filename}")
                return filepath

            logger.info(f"Скачивание: {filename}")

            # Настраиваем заголовки для имитации браузера
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "*/*",
                "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                "Referer": "https://spotidown.app/",
                "Origin": "https://spotidown.app",
            }

            response = requests.get(url, headers=headers, stream=True, timeout=60)
            response.raise_for_status()

            # Сохраняем файл
            total_size = int(response.headers.get("content-length", 0))
            downloaded = 0

            with open(filepath, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)

            logger.info(f"Скачан: {filename} ({downloaded / 1024 / 1024:.1f} MB)")
            return filepath

        except requests.RequestException as e:
            logger.error(f"Ошибка скачивания {filename}: {e}")
            return None
        except Exception as e:
            logger.error(f"Неожиданная ошибка при скачивании {filename}: {e}")
            return None

    def extract_spotify_url(self, text: str) -> Optional[str]:
        """
        Извлечение Spotify URL из текста

        Args:
            text: Текст с ссылкой

        Returns:
            Извлеченный URL или None
        """
        # Паттерны для Spotify ссылок
        patterns = [
            r"(https?://open\.spotify\.com/(track|playlist|album)/[a-zA-Z0-9]+(?:\?[^ \n]*)?)",
            r"(spotify:(track|playlist|album):[a-zA-Z0-9]+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)

        return None

    def submit_url(self, spotify_url: str) -> bool:
        """
        Отправка Spotify URL на сайт

        Args:
            spotify_url: Spotify ссылка

        Returns:
            Успешно ли отправлено
        """
        try:
            # Переходим на главную страницу
            self.page.goto(self.site_url, wait_until='networkidle')

            # Ждем появления поля ввода
            url_input = self.page.wait_for_selector('#url', state='visible')

            # Очищаем поле и вводим URL
            url_input.fill('')
            url_input.type(spotify_url)

            # Находим и нажимаем кнопку отправки
            submit_btn = self.page.wait_for_selector('#send', state='visible')
            submit_btn.click()

            # Ждем появления результатов
            self.page.wait_for_selector('form[name="submitspurl"]', state='visible')

            logger.info(f"URL успешно отправлен: {spotify_url}")
            return True

        except PlaywrightTimeout:
            logger.error("Таймаут при отправке URL")
            return False
        except Exception as e:
            logger.error(f"Ошибка при отправке URL: {e}")
            return False

    def get_track_count(self) -> int:
        """
        Получение количества треков на странице

        Returns:
            Количество треков
        """
        try:
            buttons = self.page.query_selector_all('form[name="submitspurl"] .abuttons.mb-0 button')
            return len(buttons)
        except Exception:
            return 0

    def get_playlist_name(self) -> Optional[str]:
        """
        Получение названия плейлиста/альбома

        Returns:
            Название или None
        """
        try:
            name_element = self.page.query_selector('.hover-underline')
            return name_element.text_content().strip() if name_element else None
        except:
            return None

    def extract_track_metadata(self, index: int) -> Optional[TrackMetadata]:
        """
        Извлечение метаданных трека по индексу

        Args:
            index: Индекс трека (0-based)

        Returns:
            Метаданные трека или None
        """
        try:
            # Находим все формы
            forms = self.page.query_selector_all('form[name="submitspurl"]')

            if index >= len(forms):
                logger.error(f"Индекс {index} вне диапазона (всего форм: {len(forms)})")
                return None

            form = forms[index]

            # Извлекаем данные из скрытого поля
            data_input = form.query_selector('input[name="data"]')
            data_value = data_input.get_attribute("value")

            # Декодируем base64
            data_decoded = base64.b64decode(data_value)
            track_data = json.loads(data_decoded)

            # Извлекаем метаданные
            track_name = track_data.get("name", "Unknown Track")
            artist = track_data.get("artist", "Unknown Artist")
            album = track_data.get("album", "")

            # Разделяем исполнителей
            if "," in artist:
                artists = [a.strip() for a in artist.split(",")]
            else:
                artists = [artist]

            return TrackMetadata(name=track_name, artists=artists, album=album)

        except Exception as e:
            logger.error(f"Ошибка извлечения метаданных трека {index}: {e}")
            return None

    def click_track_button(self, index: int) -> bool:
        """
        Клик по кнопке трека

        Args:
            index: Индекс трека

        Returns:
            Успешно ли выполнен клик
        """
        try:
            # Находим все кнопки
            buttons = self.page.query_selector_all('form[name="submitspurl"] .abuttons.mb-0 button')

            if index >= len(buttons):
                logger.error(f"Индекс кнопки {index} вне диапазона")
                return False

            button = buttons[index]

            # Скроллим к кнопке
            button.scroll_into_view_if_needed()

            # Небольшая задержка перед кликом
            time.sleep(0.5)

            # Кликаем
            button.click()
            logger.debug(f"Клик по кнопке трека {index}")
            return True

        except Exception as e:
            logger.error(f"Ошибка клика по кнопке трека {index}: {e}")
            return False

    def wait_for_download_page(self) -> bool:
        """
        Ожидание загрузки страницы скачивания

        Returns:
            Загрузилась ли страница
        """
        try:
            # Ждем появления блока скачивания
            self.page.wait_for_selector('.spotidown-downloader', state='visible')

            # Ждем появления ссылок для скачивания
            self.page.wait_for_selector('.spotidown-downloader-right .abuttons.mb-0 a', state='visible')

            logger.debug("Страница скачивания загружена")
            return True

        except PlaywrightTimeout:
            logger.error("Таймаут ожидания страницы скачивания")
            return False
        except Exception as e:
            logger.error(f"Ошибка ожидания страницы скачивания: {e}")
            return False

    def get_download_links(self) -> Optional[Dict[str, str]]:
        """
        Получение ссылок для скачивания

        Returns:
            Словарь с ссылками {'mp3': url, 'cover': url} или None
        """
        try:
            # Находим все ссылки
            download_links = self.page.query_selector_all('.spotidown-downloader-right .abuttons.mb-0 a')

            if len(download_links) < 2:
                logger.error(f"Недостаточно ссылок: {len(download_links)}")
                return None

            # Первая ссылка - MP3, вторая - обложка
            mp3_link = download_links[0].get_attribute("href")
            cover_link = download_links[1].get_attribute("href")

            if not mp3_link or not cover_link:
                logger.error("Не удалось получить ссылки")
                return None

            return {"mp3": mp3_link, "cover": cover_link}

        except Exception as e:
            logger.error(f"Ошибка получения ссылок: {e}")
            return None

    def download_track(self, index: int) -> DownloadResult:
        """
        Скачивание одного трека по индексу

        Args:
            index: Индекс трека

        Returns:
            Результат скачивания
        """
        # Извлекаем метаданные
        metadata = self.extract_track_metadata(index)
        if not metadata:
            return DownloadResult(
                track=TrackMetadata(name="Unknown", artists=["Unknown"]),
                success=False,
                error="Не удалось извлечь метаданные",
            )

        logger.info(f"Скачивание: {metadata.artist} - {metadata.name}")

        # Кликаем по кнопке трека
        if not self.click_track_button(index):
            return DownloadResult(track=metadata, success=False, error="Не удалось нажать кнопку трека")

        # Ждем загрузки страницы скачивания
        if not self.wait_for_download_page():
            return DownloadResult(track=metadata, success=False, error="Страница скачивания не загрузилась")

        # Получаем ссылки для скачивания
        links = self.get_download_links()
        if not links:
            return DownloadResult(track=metadata, success=False, error="Не удалось получить ссылки для скачивания")

        # Скачиваем файлы
        audio_file = None
        cover_file = None

        # Скачиваем MP3
        if "mp3" in links and links["mp3"]:
            audio_filename = f"{self.safe_filename(metadata.artist)} - {self.safe_filename(metadata.name)}.mp3"
            audio_file = self.download_file(links["mp3"], audio_filename)

        # Скачиваем обложку
        if "cover" in links and links["cover"]:
            cover_filename = f"{self.safe_filename(metadata.artist)} - {self.safe_filename(metadata.name)}.jpg"
            cover_file = self.download_file(links["cover"], cover_filename)

        # Проверяем успешность
        success = audio_file is not None and audio_file.exists()

        return DownloadResult(
            track=metadata,
            audio_file=audio_file,
            cover_file=cover_file,
            success=success,
            error=None if success else "Не удалось скачать аудиофайл",
        )

    def download_playlist(self, spotify_url: str, max_tracks: int = None) -> List[DownloadResult]:
        """
        Скачивание плейлиста/альбома

        Args:
            spotify_url: Spotify ссылка на плейлист/альбом
            max_tracks: Максимальное количество треков (None - все)

        Returns:
            Список результатов скачивания
        """
        results = []

        # Отправляем URL
        if not self.submit_url(spotify_url):
            logger.error("Не удалось отправить URL")
            return results

        # Получаем количество треков
        track_count = self.get_track_count()
        if track_count == 0:
            logger.error("Треки не найдены")
            return results

        # Получаем название плейлиста
        playlist_name = self.get_playlist_name()
        logger.info(f"Плейлист: {playlist_name}, треков: {track_count}")

        # Определяем сколько треков скачивать
        if max_tracks is None:
            max_tracks = track_count
        else:
            max_tracks = min(max_tracks, track_count)

        # Скачиваем треки
        for i in range(max_tracks):
            logger.info(f"Трек {i + 1}/{max_tracks}")

            # Возвращаемся к списку треков (обновляем страницу)
            if i > 0:
                if not self.submit_url(spotify_url):
                    logger.error(f"Не удалось вернуться к списку треков для трека {i}")
                    continue

            # Скачиваем трек
            result = self.download_track(i)
            results.append(result)

            if result.success:
                logger.info(f"✓ Успешно: {result.track.artist} - {result.track.name}")
            else:
                logger.error(f"✗ Ошибка: {result.error}")

            # Небольшая пауза между треками
            if i < max_tracks - 1:
                time.sleep(1)

        # Статистика
        successful = sum(1 for r in results if r.success)
        logger.info(f"Готово! Успешно: {successful}/{len(results)}")

        return results

    def download_single_track(self, spotify_url: str) -> DownloadResult:
        """
        Скачивание одного трека

        Args:
            spotify_url: Spotify ссылка на трек

        Returns:
            Результат скачивания
        """
        # Отправляем URL
        if not self.submit_url(spotify_url):
            return DownloadResult(
                track=TrackMetadata(name="Unknown", artists=["Unknown"]), 
                success=False, 
                error="Не удалось отправить URL"
            )

        # Скачиваем первый (и единственный) трек
        return self.download_track(0)

    def process_url(self, spotify_url: str, max_tracks: int = None) -> List[DownloadResult]:
        """
        Универсальный метод обработки Spotify URL

        Args:
            spotify_url: Spotify ссылка
            max_tracks: Максимальное количество треков (только для плейлистов/альбомов)

        Returns:
            Список результатов скачивания
        """
        # Определяем тип ссылки
        if "track" in spotify_url:
            logger.info("Обработка трека")
            result = self.download_single_track(spotify_url)
            return [result]
        elif "playlist" in spotify_url or "album" in spotify_url:
            logger.info("Обработка плейлиста/альбома")
            return self.download_playlist(spotify_url, max_tracks)
        else:
            logger.error(f"Неизвестный тип Spotify URL: {spotify_url}")
            return []


# Пример использования
if __name__ == "__main__":
    # Создаем парсер
    parser = SpotifyParser(cache_dir="./spotify_cache", headless=True)

    try:
        # Запускаем браузер
        if not parser.start():
            exit(1)

        # Примеры использования

        # 1. Скачивание одного трека
        print("\n=== Скачивание одного трека ===")
        track_url = "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"
        result = parser.download_single_track(track_url)

        if result.success:
            print(f"Успешно скачан: {result.track.artist} - {result.track.name}")
            print(f"Аудио: {result.audio_file}")
            print(f"Обложка: {result.cover_file}")
        else:
            print(f"Ошибка: {result.error}")

        # 2. Скачивание плейлиста (первые 3 трека)
        print("\n=== Скачивание плейлиста ===")
        playlist_url = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
        results = parser.download_playlist(playlist_url, max_tracks=3)

        for i, result in enumerate(results, 1):
            status = "✓" if result.success else "✗"
            print(f"{i}. {status} {result.track.artist} - {result.track.name}")

    finally:
        # Всегда останавливаем браузер
        parser.stop()