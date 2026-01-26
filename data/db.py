from sqlalchemy import create_engine, Column, String, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from datetime import datetime
import logging as log

Base = declarative_base()


class Track(Base):
    __tablename__ = "tracks"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)

    # Отношение "один-к-одному" (uselist=False)
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
        """Возвращает объект Track со всеми вложенными метаданными."""
        with self.Session() as session:
            # .get() — самый быстрый способ поиска по Primary Key
            track = session.get(Track, track_id)
            if not track:
                log.info(f"Track with id {track_id} not found.")
                return None
            return track

    def save_data(self, track_id, title, metadata) -> None:
        """
        Принимает объект TrackModel.
        session.merge сам проверит ID:
        - Если есть в БД -> обновит поля
        - Если нет -> создаст запись
        """
        with self.Session() as session:
            try:
                new_track = Track(id=track_id, title=title)
                new_meta = TrackMetadata(track_id=track_id, **metadata)

                new_track.metadata_info = new_meta
                session.merge(new_track)
                session.commit()
            except Exception as e:
                log.error(f"Ошибка сохранения: {e}")
                session.rollback()
