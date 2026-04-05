import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp, formatTime } from '@/context/AppContext';
import type { SourceType } from '@/lib/types';
import { api, detectSource, isUrl, type SearchResult, type DownloadResult } from '@/lib/api';
import { Link, Search, Play, Download, AlertTriangle, Heart, Plus, Repeat, Shuffle, SkipBack, SkipForward, Pause, Music, FileAudio, VolumeX, Volume1, Volume2 } from 'lucide-react';
import { AudioSpectrogram } from '@/components/AudioSpectrogram';

/* ===== Types ===== */
type ViewState =
  | 'idle'
  | 'selectSource'
  | 'searching'
  | 'results'
  | 'downloading'
  | 'playing'
  | 'error';

interface SourceDef {
  id: SourceType;
  icon: string;
  colorClass: string;
  available: boolean;
}

const SOURCES: SourceDef[] = [
  { id: 'youtube', icon: '▶️', colorClass: 'youtube', available: true },
  { id: 'spotify', icon: '🟢', colorClass: 'spotify', available: true },
  { id: 'yandex', icon: '🎵', colorClass: 'yandex', available: false },
];

/* ===== ListenView ===== */
export function ListenView() {
  const { t, activeView, nowPlaying } = useApp();

  if (activeView !== 'listen') return null;

  return (
    <section className="view active">
      <div className="view-header">
        <h1 className="gradient-text">{t.listenTitle}</h1>
        <p className="subtitle">{t.listenSubtitle}</p>
      </div>
      <TrackInput />
      {/* Show full player if something is playing (even from playlist) */}
      {nowPlaying && <FullPlayer />}
    </section>
  );
}

/* ===== TrackInput ===== */
function TrackInput() {
  const { t, showToast, playTrack, registerTrack, nowPlaying, refreshLibrary } = useApp();

  const [inputValue, setInputValue] = useState('');
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [activeSource, setActiveSource] = useState<SourceType | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const detectedSource = useMemo(() => detectSource(inputValue), [inputValue]);
  const inputIsUrl = useMemo(() => isUrl(inputValue), [inputValue]);

  // Show source selector when typing
  useEffect(() => {
    if (inputValue.trim().length > 0 && viewState === 'idle') {
      setViewState('selectSource');
    } else if (inputValue.trim().length === 0 && viewState === 'selectSource') {
      setViewState('idle');
      setSearchResults([]);
      setErrorMessage('');
    }
  }, [inputValue]);

  /* --- Search --- */
  const doSearch = useCallback(async (source: SourceType) => {
    const query = inputValue.trim();
    if (!query) return;

    if (source === 'spotify' && !isUrl(query)) {
      setActiveSource(source);
      setErrorMessage(t.spotifyUrlOnly);
      setViewState('error');
      showToast(t.spotifyUrlOnly, 'error');
      return;
    }

    setActiveSource(source);
    setViewState('searching');
    setSearchResults([]);
    setErrorMessage('');

    try {
      const results = await api.search(query, source);
      setSearchResults(results);
      setViewState('results');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setViewState('error');
      showToast(`${t.errorSearch}: ${msg}`, 'error');
    }
  }, [inputValue, showToast, t]);

  /* --- Download & Play --- */
  const doDownloadAndPlay = useCallback(async (
    url: string,
    source: SourceType,
    title?: string,
    artist?: string,
    thumbnail?: string,
  ) => {
    setViewState('downloading');
    setActiveSource(source);
    setErrorMessage('');

    try {
      if (source === 'spotify' && !isUrl(url)) {
        throw new Error(t.spotifyUrlOnly);
      }

      const result: DownloadResult = await api.download(url, source);

      if (!result.success) {
        throw new Error(result.error || 'Download failed');
      }

      if (!result.filename && !result.stream_url) {
        throw new Error('No file returned from server');
      }

      const sUrl = result.stream_url || api.getStreamUrl(result.filename!);
      const finalTitle = result.title || title || 'Unknown Track';
      const finalArtist = result.artist || artist || 'Unknown Artist';
      const trackId = `track_${Date.now()}`;

      const track = {
        id: result.filename ? `lib_${result.filename}` : trackId,
        name: finalTitle,
        artist: finalArtist,
        duration: result.duration ? formatTime(result.duration) : '0:00',
        url: sUrl,
        thumbnail: thumbnail || '',
        source: source,
        filename: result.filename,
      };

      // Register and play via global context
      registerTrack(track);
      await refreshLibrary();
      playTrack(track, sUrl);

      setViewState('playing');
      showToast(t.trackReady, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setViewState('error');
      showToast(`${t.errorDownload}: ${msg}`, 'error');
    }
  }, [showToast, t, registerTrack, playTrack, refreshLibrary]);

  /* --- Source card click --- */
  const handleSourceClick = useCallback((source: SourceDef) => {
    if (!source.available) return;
    if (!inputValue.trim()) return;

    if (inputIsUrl) {
      doDownloadAndPlay(inputValue.trim(), source.id);
    } else {
      doSearch(source.id);
    }
  }, [inputValue, inputIsUrl, doDownloadAndPlay, doSearch]);

  /* --- Search result click --- */
  const handleResultClick = useCallback((result: SearchResult) => {
    doDownloadAndPlay(
      result.url,
      result.source || activeSource || 'youtube',
      result.title,
      result.artist,
      result.thumbnail, // Pass thumbnail through!
    );
  }, [doDownloadAndPlay, activeSource]);

  /* --- Load button --- */
  const handleLoadClick = useCallback(() => {
    if (!inputValue.trim()) return;
    if (detectedSource) {
      const src = SOURCES.find(s => s.id === detectedSource);
      if (src && src.available) {
        handleSourceClick(src);
        return;
      }
    }
    setViewState('selectSource');
  }, [inputValue, detectedSource, handleSourceClick]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLoadClick();
  }, [handleLoadClick]);

  const handleBackToResults = useCallback(() => {
    setViewState('results');
  }, []);

  const handleNewSearch = useCallback(() => {
    setViewState(inputValue.trim() ? 'selectSource' : 'idle');
    setSearchResults([]);
    setErrorMessage('');
  }, [inputValue]);

  // If nowPlaying is set and we're in idle/selectSource, show player view
  const showingPlayer = viewState === 'playing' || (nowPlaying && viewState === 'idle');

  return (
    <>
      {/* Input */}
      <div className="input-group">
        <div className="glass-effect">
          <Link className="input-icon" size={24} />
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.placeholderTrack}
            autoComplete="off"
            maxLength={2048}
          />
          <button className="primary-btn" onClick={handleLoadClick}>
            <span className="btn-text">{t.load}</span>
            <Search className="btn-icon" size={18} />
          </button>
        </div>
      </div>

      {/* Source selector */}
      {viewState === 'selectSource' && (
        <SourceSelector
          detectedSource={detectedSource}
          inputIsUrl={inputIsUrl}
          onSelect={handleSourceClick}
        />
      )}

      {/* Searching spinner */}
      {viewState === 'searching' && (
        <div className="loader">
          <div className="loader-spinner" />
          <span className="loader-text">
            {t.searching} {activeSource === 'youtube' ? t.sourceYoutube
              : activeSource === 'spotify' ? t.sourceSpotify
              : ''}…
          </span>
        </div>
      )}

      {/* Search results */}
      {viewState === 'results' && (
        <SearchResultsList
          results={searchResults}
          source={activeSource}
          onSelect={handleResultClick}
          onNewSearch={handleNewSearch}
        />
      )}

      {/* Downloading spinner */}
      {viewState === 'downloading' && (
        <div className="loader">
          <div className="loader-spinner" />
          <span className="loader-text">{t.downloading}…</span>
        </div>
      )}

      {/* Error */}
      {viewState === 'error' && (
        <div className="error-banner">
          <AlertTriangle className="error-icon" size={32} />
          <div className="error-content">
            <p className="error-title">{t.errorSearch}</p>
            <p className="error-message">{errorMessage}</p>
          </div>
          <button className="error-retry-btn" onClick={handleNewSearch}>
            {t.newSearch}
          </button>
        </div>
      )}

      {/* Navigation when player is showing */}
      {viewState === 'playing' && (
        <div className="player-nav">
          {searchResults.length > 0 && (
            <button className="back-btn" onClick={handleBackToResults}>
              {t.backToSearch}
            </button>
          )}
          <button className="back-btn" onClick={handleNewSearch}>
            {t.newSearch}
          </button>
        </div>
      )}

      {/* Recent tracks — only when idle and nothing playing */}
      {!showingPlayer && (viewState === 'idle' || viewState === 'selectSource') && (
        <RecentTracks />
      )}
    </>
  );
}

/* ===== SourceSelector ===== */
function SourceSelector({
  detectedSource,
  inputIsUrl,
  onSelect,
}: {
  detectedSource: SourceType | null;
  inputIsUrl: boolean;
  onSelect: (source: SourceDef) => void;
}) {
  const { t } = useApp();

  return (
    <div className="source-selector">
      <div className="source-selector-title">
        <span>📡</span>
        <span>{t.selectSource}</span>
        {detectedSource && inputIsUrl && (
          <span className="source-auto-badge">✨ {t.sourceDetected}</span>
        )}
      </div>

      <div className="source-cards">
        {SOURCES.map(source => {
          const isDetected = detectedSource === source.id;
          const names: Record<SourceType, string> = {
            youtube: t.sourceYoutube,
            spotify: t.sourceSpotify,
            yandex: t.sourceYandex,
          };
          const descs: Record<SourceType, string> = {
            youtube: t.sourceYoutubeDesc,
            spotify: t.sourceSpotifyDesc,
            yandex: t.sourceYandexDesc,
          };

          return (
            <div
              key={source.id}
              className={[
                'source-card',
                source.colorClass,
                isDetected ? 'detected' : '',
                !source.available ? 'disabled' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelect(source)}
            >
              {isDetected && (
                <span className="source-badge detected">{t.sourceDetected}</span>
              )}
              {!source.available && (
                <span className="source-badge coming-soon">{t.sourceComingSoon}</span>
              )}

              <span className="source-card-icon">{source.icon}</span>
              <span className="source-card-name">{names[source.id]}</span>
              <span className="source-card-desc">{descs[source.id]}</span>

              <button
                className="source-card-btn"
                disabled={!source.available}
              >
                {source.available
                  ? inputIsUrl ? `${t.playTrack} →` : `${t.searchIn} →`
                  : t.sourceComingSoon}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===== SearchResultsList ===== */
function SearchResultsList({
  results,
  source,
  onSelect,
  onNewSearch,
}: {
  results: SearchResult[];
  source: SourceType | null;
  onSelect: (result: SearchResult) => void;
  onNewSearch: () => void;
}) {
  const { t } = useApp();

  if (results.length === 0) {
    return (
      <div className="search-results-empty">
        <span className="empty-icon">🔍</span>
        <p>{t.noResults}</p>
        <span className="empty-hint">{t.noResultsHint}</span>
        <button className="back-btn" onClick={onNewSearch}>{t.newSearch}</button>
      </div>
    );
  }

  return (
    <div className="search-results">
      <div className="search-results-header">
        <h3 className="section-heading">
          {t.searchResults}
          <span className="results-count">{results.length}</span>
        </h3>
        <p className="search-results-hint">{t.selectTrack}</p>
      </div>

      <div className="search-results-list">
        {results.map((result, index) => (
          <div
            key={result.id || index}
            className="search-result-item"
            onClick={() => onSelect(result)}
          >
            <div className={`result-thumbnail ${!result.thumbnail ? 'no-thumb' : ''}`}>
              {result.thumbnail ? (
                <img
                  src={result.thumbnail}
                  alt={result.title}
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.classList.add('no-thumb');
                  }}
                />
              ) : (
                <span className="result-thumb-placeholder">🎵</span>
              )}
            </div>

            <div className="result-info">
              <span className="result-title">{result.title}</span>
              <span className="result-artist">{result.artist}</span>
            </div>

            <span className="result-duration">{result.duration}</span>

            <span className={`result-source-badge ${result.source || source || ''}`}>
              {result.source === 'youtube' ? '▶️' : result.source === 'spotify' ? '🟢' : '🎵'}
            </span>

            <button className="result-play-btn" title={t.playTrack}>
              ▶
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== Full Player (uses global audio) ===== */
function FullPlayer() {
  const {
    isPlaying, togglePlay, audioRef, nowPlaying,
    toggleFavorite, isFavorite, isDownloaded, showToast, t,
    currentTrackId,
  } = useApp();

  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');
  const [volume, setVolume] = useState(80);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [audioError, setAudioError] = useState('');
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Sync volume with audio on mount
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      setVolume(Math.round(audio.volume * 100));
    }
  }, [audioRef]);

  // Audio event listeners for UI
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (!isFinite(audio.duration) || audio.duration === 0) return;
      setProgress((audio.currentTime / audio.duration) * 100);
      setCurrentTime(formatTime(audio.currentTime));
      setDuration(formatTime(audio.duration));
    };

    const onLoadedMetadata = () => {
      if (isFinite(audio.duration)) {
        setDuration(formatTime(audio.duration));
      }
    };

    const onEnded = () => {
      if (repeat) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    };

    const onError = () => {
      const err = audio.error;
      let msg = 'Ошибка воспроизведения';
      if (err) {
        switch (err.code) {
          case MediaError.MEDIA_ERR_ABORTED: msg = 'Воспроизведение прервано'; break;
          case MediaError.MEDIA_ERR_NETWORK: msg = 'Сетевая ошибка при загрузке'; break;
          case MediaError.MEDIA_ERR_DECODE: msg = 'Ошибка декодирования аудио'; break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: msg = 'Формат не поддерживается'; break;
        }
      }
      setAudioError(msg);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    // Initialize time display
    if (isFinite(audio.duration)) {
      setDuration(formatTime(audio.duration));
      setCurrentTime(formatTime(audio.currentTime));
      setProgress((audio.currentTime / audio.duration) * 100);
    }

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [audioRef, repeat]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressBarRef.current;
    if (!audio || !isFinite(audio.duration) || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  }, [audioRef]);

  const handleVolume = useCallback((val: number) => {
    setVolume(val);
    const audio = audioRef.current;
    if (audio) audio.volume = val / 100;
  }, [audioRef]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.volume > 0) {
      audio.dataset.prev = String(audio.volume);
      audio.volume = 0;
      setVolume(0);
    } else {
      const prev = parseFloat(audio.dataset.prev || '0.8');
      audio.volume = prev;
      setVolume(prev * 100);
    }
  }, [audioRef]);

  const openAddModal = () => {
    if (currentTrackId) {
      window.dispatchEvent(new CustomEvent('openAddToPlaylistModal', { detail: currentTrackId }));
    }
  };

  if (!nowPlaying) return null;

  const { track } = nowPlaying;
  const trackId = currentTrackId || '';
  const liked = isFavorite(trackId);

  return (
    <div className="player">
      <div className="player-bg" />
      <div className="player-content">
      {/* Audio error */}
      {audioError && (
        <div className="audio-error-banner">
          <AlertTriangle size={18} />
          <span>{audioError}</span>
        </div>
      )}

      {/* Cover with thumbnail */}
      <div className="cover-container">
          <div className="cover">
            {track.thumbnail ? (
              <img
                src={track.thumbnail}
                alt={track.name}
                className="cover-image"
              />
            ) : (
              <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <Music size={64} opacity={0.5} />
              </div>
            )}
            <div className="cover-overlay">
              <button className="play-btn-large" onClick={togglePlay}>
                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" style={{ marginLeft: '4px' }} />}
              </button>
            </div>
          </div>
        </div>

        <div className="track-details">
          <div className="track-info">
            <strong className="track-title">{track.name}</strong>
            <span className="track-artist">{track.artist}</span>
          </div>
          <div className="track-actions">
            <button
              className={`action-btn like-btn ${liked ? 'liked' : ''}`}
              onClick={() => toggleFavorite(trackId)}
            >
              <Heart className="heart-icon" size={24} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button
              className={`action-btn download-btn ${isDownloaded(trackId) ? 'downloaded' : ''}`}
              onClick={() => showToast(isDownloaded(trackId) ? t.alreadyDownloaded : t.notDownloadedYet, isDownloaded(trackId) ? 'success' : 'error')}
            >
              {isDownloaded(trackId) ? <FileAudio size={20} /> : <Download size={20} />}
            </button>
            <button className="action-btn" onClick={openAddModal}>
              <Plus size={24} />
            </button>
          </div>
        </div>

        <div className="waveform-container" style={{ position: 'relative', margin: '30px 0 10px 0', width: '100%', paddingBottom: '8px' }}>
          {/* Real-time audio spectrogram */}
          <AudioSpectrogram
            audioElement={audioRef.current}
            isPlaying={isPlaying}
            barCount={64}
            barColor="#6366f1"
            barGap={4}
            height={60}
            mirror={false}
            roundedBars={true}
            gradient={true}
            className="audio-spectrogram"
          />
          <div
            className="progress-bar"
            ref={progressBarRef}
            onClick={handleProgressClick}
            style={{ bottom: 0 }}
          >
            <div className="progress-fill" style={{ width: `${progress}%` }}>
              <div className="progress-handle" />
            </div>
          </div>
        </div>

        <div className="time-display">
          <span>{currentTime}</span>
          <span>{duration}</span>
        </div>

        <div className="player-controls">
          <button
            className={`control-btn ${shuffle ? 'active' : ''}`}
            onClick={() => setShuffle(!shuffle)}
          ><Shuffle size={20} /></button>
          <button className="control-btn"><SkipBack size={24} fill="currentColor" /></button>
          <button className="control-btn play-btn" onClick={togglePlay}>
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: '4px' }} />}
          </button>
          <button className="control-btn"><SkipForward size={24} fill="currentColor" /></button>
          <button
            className={`control-btn ${repeat ? 'active' : ''}`}
            onClick={() => setRepeat(!repeat)}
          ><Repeat size={20} /></button>
        </div>

        <div className="volume-control">
          <span className="volume-icon" role="button" tabIndex={0} onClick={toggleMute}>
            {volume === 0 ? <VolumeX size={20} /> : volume < 50 ? <Volume1 size={20} /> : <Volume2 size={20} />}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            className="volume-slider"
            onChange={(e) => handleVolume(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}

/* ===== RecentTracks ===== */
function RecentTracks() {
  const { t, recentTracks, isFavorite, toggleFavorite } = useApp();

  return (
    <section className="recent-section">
      <h3 className="section-heading">{t.recentTitle}</h3>
      <div className="recent-tracks">
        {recentTracks.map(track => (
          <div key={track.id} className="recent-track" data-id={track.id}>
            <div className="recent-cover">
              {track.thumbnail ? (
                <img src={track.thumbnail} alt={track.name} />
              ) : null}
            </div>
            <div className="recent-info">
              <span className="recent-name">{track.name}</span>
              <span className="recent-artist">{track.artist}</span>
            </div>
            <button
              className={`like-btn-small ${isFavorite(track.id) ? 'liked' : ''}`}
              onClick={() => toggleFavorite(track.id)}
            >
              <span className="heart-small">{isFavorite(track.id) ? '❤' : '♡'}</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
