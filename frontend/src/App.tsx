import { useEffect, useRef, useState, useCallback } from 'react';
import { AppProvider, useApp, formatTime } from '@/context/AppContext';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { ListenView } from '@/components/ListenView';
import { PlaylistsView } from '@/components/PlaylistsView';
import { CreatePlaylistModal, AddToPlaylistModal } from '@/components/Modals';
import { ToastContainer } from '@/components/Toast';
import { AudioSpectrogram } from '@/components/AudioSpectrogram';
import { Play, Pause, ChevronUp, Heart, SkipBack, SkipForward, ListMusic } from 'lucide-react';

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function AppContent() {
  const { nowPlaying } = useApp();

  return (
    <>
      <div className={`app ${nowPlaying ? 'has-now-playing' : ''}`}>
        <Sidebar />
        <main className="main">
          <Topbar />
          <ListenView />
          <PlaylistsView />
        </main>
      </div>
      {/* Global audio — always mounted, never destroyed */}
      <GlobalAudio />
      {/* Persistent mini-player at bottom */}
      <NowPlayingBar />
      <CreatePlaylistModal />
      <AddToPlaylistModal />
      <ToastContainer />
    </>
  );
}

/* ===== Global Audio Element ===== */
function GlobalAudio() {
  const { audioRef, setIsPlaying, nowPlaying, registerTrack, playNext } = useApp();
  const nowPlayingRef = useRef(nowPlaying);
  nowPlayingRef.current = nowPlaying;

  // Persistent audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      playNext();
    };
    const onLoadedMetadata = () => {
      const np = nowPlayingRef.current;
      if (np && isFinite(audio.duration)) {
        registerTrack({
          ...np.track,
          duration: formatTime(audio.duration),
        });
      }
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [audioRef, setIsPlaying, registerTrack, playNext]);

  return (
    <audio
      ref={audioRef}
      preload="auto"
      style={{ display: 'none' }}
    />
  );
}

/* ===== Now Playing Bar (persistent mini player) ===== */
function NowPlayingBar() {
  const {
    nowPlaying, isPlaying, togglePlay, audioRef,
    isFavorite, toggleFavorite, goHome, activeView,
    currentTrackId, playNext, playPrev
  } = useApp();

  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Time update listener
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (!isFinite(audio.duration) || audio.duration === 0) return;
      setProgress((audio.currentTime / audio.duration) * 100);
      setCurrentTime(formatTime(audio.currentTime));
      setDuration(formatTime(audio.duration));
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    return () => audio.removeEventListener('timeupdate', onTimeUpdate);
  }, [audioRef]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressBarRef.current;
    if (!audio || !isFinite(audio.duration) || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  }, [audioRef]);

  if (!nowPlaying) return null;

  const { track } = nowPlaying;
  const liked = currentTrackId ? isFavorite(currentTrackId) : false;

  return (
    <div className="now-playing-bar">
      {/* Progress line at top */}
      <div
        className="npb-progress"
        ref={progressBarRef}
        onClick={handleProgressClick}
      >
        <div className="npb-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="npb-content">
        {/* Left: Thumbnail + info */}
        <div className="npb-left" onClick={goHome}>
          <div className="npb-cover">
            {track.thumbnail ? (
              <img src={track.thumbnail} alt={track.name} />
            ) : (
              <span className="npb-cover-placeholder">🎵</span>
            )}
          </div>
          <div className="npb-info">
            <span className="npb-title">{track.name}</span>
            <span className="npb-artist">{track.artist}</span>
          </div>
        </div>

        {/* Center: Mini waveform + controls */}
        <div className="npb-center">
          <button className="npb-icon-btn" onClick={playPrev} title="Previous">
            <SkipBack size={20} fill="currentColor" />
          </button>
          
          <button className="npb-play-btn" onClick={togglePlay}>
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '4px' }} />}
          </button>

          <button className="npb-icon-btn" onClick={playNext} title="Next">
            <SkipForward size={20} fill="currentColor" />
          </button>
        </div>

        {/* Right: Time + like */}
        <div className="npb-right">
          {/* Real-time mini spectrogram */}
          <div className="npb-waveform">
            <AudioSpectrogram
              audioElement={audioRef.current}
              isPlaying={isPlaying}
              barCount={16}
              barColor="#a78bfa"
              barGap={2}
              height={32}
              mirror={true}
              roundedBars={true}
              gradient={true}
              className="npb-spectrogram"
            />
          </div>

          <span className="npb-time">{currentTime} / {duration}</span>
          
          {currentTrackId && (
            <button
              className={`like-btn-small ${liked ? 'liked' : ''}`}
              onClick={() => toggleFavorite(currentTrackId)}
            >
              <Heart className="heart-small" size={18} fill={liked ? "currentColor" : "none"} />
            </button>
          )}

          <button className="npb-icon-btn" onClick={goHome} title="Queue">
            <ListMusic size={20} />
          </button>

          {activeView !== 'listen' && (
            <button className="npb-expand-btn" onClick={goHome} title="Open Player">
              <ChevronUp size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
