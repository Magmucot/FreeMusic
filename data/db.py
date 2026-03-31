from sqlalchemy import create_engine, Column, String, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, joinedload
from datetime import datetime
from dataclasses import dataclass, field
from typing import Any
import logging as log
import hashlib

Base = declarative_base()


@dataclass
class TrackModel:
    """DTO для передачи данных между загрузчиками и БД."""

    title: str
    uploader: str | None = None
    duration: int = 0
    url: str | None = None
    platform: str = "unknown"
    from_storage: bool = False
    filepath: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)

    def to_metadata(self) -> dict[str, Any]:
        data = {
            "title": self.title,
            "uploader": self.uploader,
            "duration": self.duration,
            "url": self.url,
            "platform": self.platform,
            "from_storage": self.from_storage,
            "filepath": self.filepath,
        }
        data.update(self.extra)
        return data


class Track(Base):
    __tablename__ = "tracks"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)

    metadata_info = relationship("TrackMetadata", back_populates="track", uselist=False, cascade="all, delete-orphan")


class TrackMetadata(Base):
    __tablename__ = "track_metadata"

    track_id = Column(String, ForeignKey("tracks.id"), primary_key=True)
    title = Column(String, nullable=False)
    uploader = Column(String)
    duration = Column(Integer, default=0)
    url = Column(String)
    platform = Column(String)
    from_storage = Column(Boolean)
    filepath = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    track = relationship("Track", back_populates="metadata_info")


class DBManager:
    def __init__(self, db_url="sqlite:///db/music_lib.db"):
        self.engine = create_engine(db_url, connect_args={"check_same_thread": False})

        if "sqlite" in db_url:
            with self.engine.connect() as con:
                con.exec_driver_sql("PRAGMA journal_mode=WAL;")

        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

    def get_data(self, track_id: str):
        with self.Session() as session:
            track = (
                session.query(Track)
                .options(joinedload(Track.metadata_info))
                .filter(Track.id == track_id)
                .first()
            )
            if not track:
                log.info(f"Track with id {track_id} not found.")
                return None
            return track

    @staticmethod
    def get_id(text: str) -> str:
        full_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        return full_hash[:16]

    def save_data(self, title_or_track, metadata=None) -> None:
        """
        Поддерживает 2 формата:
        1) save_data(title: str, metadata: dict)
        2) save_data(track: TrackModel)
        """
        if isinstance(title_or_track, TrackModel):
            title = title_or_track.title
            metadata = title_or_track.to_metadata()
        else:
            title = str(title_or_track)
            metadata = metadata or {"title": title}

        metadata.setdefault("title", title)

        with self.Session() as session:
            try:
                t_id = self.get_id(title)
                new_track = Track(id=t_id, title=title)
                new_meta = TrackMetadata(track_id=t_id, **metadata)

                new_track.metadata_info = new_meta
                session.merge(new_track)
                session.commit()
            except Exception as e:
                log.error(f"Ошибка сохранения: {e}")
                session.rollback()
