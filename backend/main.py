import asyncio
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(root_dir))

from data.db import DBManager
from backend.youtube import YoutubeDownloader
from backend.app import MusicApp


async def main():
    app = MusicApp()
    await app.download_audio("Never Gonna Give You Up")


if __name__ == "__main__":
    asyncio.run(main())
