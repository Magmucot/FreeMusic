from abc import ABC, abstractmethod
from typing import Union, List
from pathlib import Path
import sys

root_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(root_dir))

from data.db import TrackModel


class BaseDownloader(ABC):
    def __init__(self, save_path="songs"):
        self.save_path = Path("data") / save_path
        self.save_path.mkdir(parents=True, exist_ok=True)

    @abstractmethod
    async def download_audio(self, url: str) -> Union[TrackModel, List[TrackModel], None]:
        """
        Скачивает контент и возвращает объекты TrackModel.
        """
        pass
