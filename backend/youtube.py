import yt_dlp
from pathlib import Path


class Youtube_download:
    def __init__(self, folder_n: str = "."):
        self.out_path = Path(__file__).resolve().parent.parent / "songs"
        print(self.out_path)

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
            ydl.download([query])


# Пример использования
if __name__ == "__main__":
    yt_d = Youtube_download("/songs")
    video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # замените на свою
    yt_d.download_audio(video_url)

    song_name = "Never Gonna Give You Up Rick Astley"
    yt_d.download_audio(song_name)
