from typing import Union, List
from pathlib import Path
import sys
import logging

root_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(root_dir))
log = logging.getLogger(__name__)


class BaseDownloader:
    def __init__(self, save_path="songs"):
        self._yt = None
        self._spotify = None
        self._yandex = None
        self.save_path = Path("data") / save_path
        self.save_path.mkdir(parents=True, exist_ok=True)

    @property
    def youtube(self):
        """Lazy init YouTube downloader"""
        if self._yt is None:
            from youtube import YoutubeDownloader

            self._yt = YoutubeDownloader()
        return self._yt

    @property
    def spotify(self):
        """Lazy init Spotify downloader"""
        if self._spotify is None:
            from spotify import SpotifyDownloader

            self._spotify = SpotifyDownloader()
        return self._spotify
