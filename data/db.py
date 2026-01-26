from sqlalchemy import create_engine, Column, String, Integer, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime
import logging as log

Base = declarative_base()

class TrackModel(Base):
    __tablename__ = 'tracks'

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    uploader = Column(String)
    duration = Column(Integer, default=0)
    url = Column(String)
    platform = Column(String)
    filepath = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

class DBManager:
    def __init__(self, db_url="sqlite:///music_lib.db"):
        self.engine = create_engine(db_url, connect_args={'check_same_thread': False})
        
        if "sqlite" in db_url:
            with self.engine.connect() as con:
                con.exec_driver_sql("PRAGMA journal_mode=WAL;")
        
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

    def save_track(self, track_obj: TrackModel) -> None:
        """
        Принимает объект TrackModel.
        session.merge сам проверит ID:
        - Если есть в БД -> обновит поля
        - Если нет -> создаст запись
        """
        if not track_obj or not isinstance(track_obj, TrackModel):
            log.warning(f"DB: Получен неверный объект для сохранения: {type(track_obj)}")
            return

        session = self.Session()
        try:
            session.merge(track_obj)
            session.commit()
            log.info(f"💾 Saved/Updated: {track_obj.title}")
        except Exception as e:
            log.error(f"DB Error: {e}")
            session.rollback()
        finally:
            session.close()

    def get_all_tracks(self):
        session = self.Session()
        tracks = session.query(TrackModel).all()
        session.close()
        return tracks
