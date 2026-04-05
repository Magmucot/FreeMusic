import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import type { TrackInfo } from '@/lib/types';
import { Play, Heart, HeartOff, FolderPlus, Download, Trash2, MoreHorizontal, Check, FolderOpen, Music, ArrowUpDown } from 'lucide-react';

function parseDuration(s: string): number {
  const parts = s.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

/* ===== Types for context menu ===== */
type TrackContext = 'all' | 'favorites' | 'downloaded' | 'userPlaylist';

/* ===== Track cover with thumbnail ===== */
function TrackCover({ track }: { track: TrackInfo }) {
  return (
    <div className="track-cover-small">
      {track.thumbnail ? (
        <img src={track.thumbnail} alt={track.name} loading="lazy" />
      ) : null}
    </div>
  );
}

/* ===== Context Menu Dropdown ===== */
function TrackContextMenu({
  track,
  contextType,
  playlistId,
  onClose,
}: {
  track: TrackInfo;
  contextType: TrackContext;
  playlistId?: string;
  onClose: () => void;
}) {
  const {
    t, isFavorite, isDownloaded,
    toggleFavorite, removeDownloaded,
    removeFromPlaylist, removeFromRegistry,
    playTrack, enrichTrack, showToast,
  } = useApp();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use setTimeout to avoid the menu closing immediately from the same click
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const enriched = enrichTrack(track);
  const liked = isFavorite(track.id);
  const isDownl = isDownloaded(track.id);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (enriched.url) {
      playTrack(enriched, enriched.url);
    }
    onClose();
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(track.id);
    onClose();
  };

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('openAddToPlaylistModal', { detail: track.id }));
    onClose();
  };

  const handleToggleDownloaded = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownl) {
      removeDownloaded(track.id);
    } else {
      showToast(t.notDownloadedYet, 'error');
    }
    onClose();
  };

  const handleRemoveFromPlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlistId) {
      removeFromPlaylist(playlistId, track.id);
    }
    onClose();
  };

  const handleRemoveFromLibrary = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await removeFromRegistry(track.id);
    onClose();
  };

  return (
    <div className="track-context-menu" ref={menuRef} onClick={e => e.stopPropagation()}>
      {/* Play */}
      {enriched.url && (
        <button className="context-menu-item" onClick={handlePlay}>
          <Play className="context-menu-icon" size={18} fill="currentColor" />
          <span>{t.play}</span>
        </button>
      )}

      {/* Favorite toggle */}
      <button className="context-menu-item" onClick={handleToggleFavorite}>
        {liked ? <HeartOff className="context-menu-icon" size={18} /> : <Heart className="context-menu-icon text-danger" size={18} fill="currentColor" />}
        <span>{liked ? t.removeFromFavorites : t.addToFavorites}</span>
      </button>

      {/* Add to playlist */}
      <button className="context-menu-item" onClick={handleAddToPlaylist}>
        <FolderPlus className="context-menu-icon" size={18} />
        <span>{t.addToPlaylistMenu}</span>
      </button>

      {/* Download toggle */}
      <button className="context-menu-item" onClick={handleToggleDownloaded}>
        {isDownl ? <Check className="context-menu-icon text-accent" size={18} /> : <Download className="context-menu-icon" size={18} />}
        <span>{isDownl ? t.removeFromDownloaded : t.addedToDownloaded}</span>
      </button>

      {/* Divider before destructive actions */}
      <div className="context-menu-divider" />

      {/* Context-specific delete */}
      {contextType === 'userPlaylist' && playlistId && (
        <button className="context-menu-item danger" onClick={handleRemoveFromPlaylist}>
          <Trash2 className="context-menu-icon" size={18} />
          <span>{t.removeFromPlaylist}</span>
        </button>
      )}

      {contextType === 'favorites' && (
        <button className="context-menu-item danger" onClick={handleToggleFavorite}>
          <Trash2 className="context-menu-icon" size={18} />
          <span>{t.removeFromFavorites}</span>
        </button>
      )}

      {contextType === 'downloaded' && (
        <button className="context-menu-item danger" onClick={handleRemoveFromLibrary}>
          <Trash2 className="context-menu-icon" size={18} />
          <span>{t.removeFromLibrary}</span>
        </button>
      )}

      {contextType === 'all' && (
        <button className="context-menu-item danger" onClick={handleRemoveFromLibrary}>
          <Trash2 className="context-menu-icon" size={18} />
          <span>{t.removeFromLibrary}</span>
        </button>
      )}
    </div>
  );
}

/* ===== Playable track item with context menu ===== */
function PlayableTrackItem({
  track: rawTrack,
  index,
  contextType = 'all',
  playlistId,
  showDragHandle,
  showDownloadBadge,
  draggable,
  dragClass,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onPlay,
}: {
  track: TrackInfo;
  index: number;
  contextType?: TrackContext;
  playlistId?: string;
  showDragHandle?: boolean;
  showDownloadBadge?: boolean;
  draggable?: boolean;
  dragClass?: string;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  onPlay?: () => void;
}) {
  const { isFavorite, toggleFavorite, playTrack, currentTrackId, isPlaying, enrichTrack, showToast, t } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  const track = enrichTrack(rawTrack);
  const isCurrentTrack = currentTrackId === track.id;

  const handleClick = useCallback(() => {
    if (onPlay) {
      onPlay();
    } else if (track.url) {
      playTrack(track, track.url);
    } else {
      showToast(t.trackUnavailable, 'error');
    }
  }, [track, playTrack, showToast, t, onPlay]);

  const handleMenuToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(prev => !prev);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuOpen(false);
  }, []);

  return (
    <div
      className={`track-item ${isCurrentTrack && isPlaying ? 'playing' : ''} ${menuOpen ? 'menu-open' : ''} ${dragClass || ''}`}
      data-id={track.id}
      draggable={draggable}
      onClick={handleClick}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {showDragHandle && <span className="drag-handle">⠿</span>}
      <span className="track-number">
        {isCurrentTrack && isPlaying ? (
          <span className="playing-indicator">♫</span>
        ) : (
          index + 1
        )}
      </span>
      <TrackCover track={track} />
      <div className="track-item-info">
        <span className={`track-item-name ${isCurrentTrack ? 'now-playing-name' : ''}`}>
          {track.name}
        </span>
        <span className="track-item-artist">{track.artist}</span>
      </div>
      <span className="track-duration">{track.duration}</span>
      {showDownloadBadge && <span className="downloaded-badge">✅</span>}
      <button
        className={`like-btn-small ${isFavorite(track.id) ? 'liked' : ''}`}
        onClick={(e) => { e.stopPropagation(); toggleFavorite(track.id); }}
      >
        <Heart className="heart-small" size={16} fill={isFavorite(track.id) ? 'currentColor' : 'none'} />
      </button>
      <div className="track-menu-wrapper">
        <button className={`more-btn ${menuOpen ? 'always-visible active' : ''}`} onClick={handleMenuToggle} title="Menu">
          <MoreHorizontal size={20} />
        </button>
        {menuOpen && (
          <TrackContextMenu
            track={track}
            contextType={contextType}
            playlistId={playlistId}
            onClose={handleMenuClose}
          />
        )}
      </div>
    </div>
  );
}

/* ===== PlaylistsView ===== */
export function PlaylistsView() {
  const { activeView, t, activePlaylistTab, setActivePlaylistTab } = useApp();

  if (activeView !== 'playlists') return null;

  return (
    <section className="view active">
      <div className="view-header">
        <h1 className="gradient-text">{t.playlistTitle}</h1>
        <p className="subtitle">{t.playlistSubtitle}</p>
      </div>

      <div className="playlist-tabs">
        <button
          className={`tab-btn ${activePlaylistTab === 'all' ? 'active' : ''}`}
          onClick={() => setActivePlaylistTab('all')}
        >{t.allTracks}</button>
        <button
          className={`tab-btn ${activePlaylistTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActivePlaylistTab('favorites')}
        >❤️ {t.favorites}</button>
        <button
          className={`tab-btn ${activePlaylistTab === 'downloaded' ? 'active' : ''}`}
          onClick={() => setActivePlaylistTab('downloaded')}
        >📥 {t.downloaded}</button>
      </div>

      <div className="playlist-content">
        {activePlaylistTab === 'all' && <AllTracksView />}
        {activePlaylistTab === 'favorites' && <FavoritesView />}
        {activePlaylistTab === 'downloaded' && <DownloadedView />}
        {activePlaylistTab === 'userPlaylist' && <UserPlaylistView />}
      </div>
    </section>
  );
}

/* ===== All Tracks — shows demo + registry tracks ===== */
function AllTracksView() {
  const { t, getAllTracks, sortType, setSortType, sortDir, toggleSortDir, playQueue } = useApp();
  const [showSortMenu, setShowSortMenu] = useState(false);

  const allTracks = useMemo(() => getAllTracks(), [getAllTracks]);

  const sortedTracks = useMemo(() => {
    const arr = [...allTracks];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortType) {
        case 'name': cmp = a.name.toLowerCase().localeCompare(b.name.toLowerCase()); break;
        case 'artist': cmp = a.artist.toLowerCase().localeCompare(b.artist.toLowerCase()); break;
        case 'duration': cmp = parseDuration(a.duration) - parseDuration(b.duration); break;
        default: cmp = 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [allTracks, sortType, sortDir]);

  const handlePlayTrack = (index: number) => {
    playQueue(sortedTracks, index);
  };

  const totalDuration = useMemo(() => {
    const total = allTracks.reduce((acc, t) => acc + parseDuration(t.duration), 0);
    return Math.ceil(total / 60);
  }, [allTracks]);

  const handleSort = (type: typeof sortType) => {
    if (sortType === type) {
      toggleSortDir();
    } else {
      setSortType(type);
    }
    setShowSortMenu(false);
  };

  const arrow = (type: typeof sortType) =>
    sortType === type ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <div className="playlist-view active">
      <div className="playlist-header">
        <div className="playlist-info">
          <span className="track-count">{allTracks.length} {t.tracksTotal}</span>
          <span className="playlist-duration">~{totalDuration} {t.approxDuration}</span>
        </div>
        <div className="playlist-actions">
          <button className="sort-btn" onClick={() => setShowSortMenu(!showSortMenu)}>
            <ArrowUpDown size={16} /> {t.sort}
          </button>
          {showSortMenu && (
            <div className="sort-menu">
              {(['name', 'artist', 'date', 'duration'] as const).map(type => (
                <button
                  key={type}
                  className={`sort-option ${sortType === type ? 'active' : ''}`}
                  onClick={() => handleSort(type)}
                >
                  {t[`sortBy${type[0].toUpperCase() + type.slice(1)}` as keyof typeof t]}{arrow(type)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="tracks-list">
        {sortedTracks.length === 0 ? (
          <div className="empty-state">
            <Music className="empty-icon text-sub" size={64} />
            <p>{t.emptyPlaylist}</p>
          </div>
        ) : (
          sortedTracks.map((track, i) => (
            <PlayableTrackItem
              key={track.id}
              track={track}
              index={i}
              contextType="all"
              onPlay={() => handlePlayTrack(i)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ===== Favorites ===== */
function FavoritesView() {
  const { t, favorites, findTrack, enrichTrack, playQueue } = useApp();

  const favoriteTracks = useMemo(() => {
    return favorites.map(id => {
      const found = findTrack(id);
      const track = found || { id, name: 'Unknown Track', artist: 'Unknown', duration: '0:00' };
      return enrichTrack(track);
    });
  }, [favorites, findTrack, enrichTrack]);

  const handlePlayTrack = (index: number) => {
    playQueue(favoriteTracks, index);
  };

  return (
    <div className="playlist-view active">
      <div className="playlist-header favorites-header">
        <div className="favorites-banner">
          <Heart className="favorites-icon-large" size={64} fill="currentColor" />
          <div className="favorites-info">
            <h2>{t.favorites}</h2>
            <p>{t.favoritesDesc} · {favorites.length} {t.tracksCount}</p>
          </div>
        </div>
      </div>
      <div className="tracks-list">
        {favorites.length === 0 ? (
          <div className="empty-state">
            <HeartOff className="empty-icon text-sub" size={64} />
            <p>{t.emptyFavorites}</p>
            <span className="empty-hint">{t.emptyFavoritesHint}</span>
          </div>
        ) : (
          favoriteTracks.map((track, i) => (
            <PlayableTrackItem
              key={track.id}
              track={track}
              index={i}
              contextType="favorites"
              onPlay={() => handlePlayTrack(i)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ===== Downloaded ===== */
function DownloadedView() {
  const { t, downloaded, findTrack, enrichTrack, playQueue } = useApp();

  const downloadedTracks = useMemo(() => {
    return downloaded.map(id => {
      const found = findTrack(id);
      const track = found || { id, name: 'Unknown Track', artist: 'Unknown', duration: '0:00' };
      return enrichTrack(track);
    });
  }, [downloaded, findTrack, enrichTrack]);

  const handlePlayTrack = (index: number) => {
    playQueue(downloadedTracks, index);
  };

  return (
    <div className="playlist-view active">
      <div className="playlist-header downloaded-header">
        <div className="downloaded-banner">
          <Download className="downloaded-icon-large" size={64} />
          <div className="downloaded-info">
            <h2>{t.downloaded}</h2>
            <p>{t.downloadedDesc} · {downloaded.length} {t.tracksCount}</p>
          </div>
        </div>
      </div>
      <div className="tracks-list">
        {downloaded.length === 0 ? (
          <div className="empty-state">
            <Download className="empty-icon text-sub" size={64} />
            <p>{t.emptyDownloaded}</p>
            <span className="empty-hint">{t.emptyDownloadedHint}</span>
          </div>
        ) : (
          downloadedTracks.map((track, i) => (
            <PlayableTrackItem
              key={track.id}
              track={track}
              index={i}
              contextType="downloaded"
              showDownloadBadge
              onPlay={() => handlePlayTrack(i)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ===== User Playlist ===== */
function UserPlaylistView() {
  const {
    t, currentPlaylist, deletePlaylist,
    reorderTracks, currentPlaylistId, enrichTrack, playQueue
  } = useApp();

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Enrich all playlist tracks with latest registry data
  const enrichedTracks = useMemo(() => {
    if (!currentPlaylist) return [];
    return currentPlaylist.tracks.map(t => enrichTrack(t));
  }, [currentPlaylist, enrichTrack]);

  const handlePlayTrack = (index: number) => {
    playQueue(enrichedTracks, index);
  };

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((targetIndex: number) => {
    if (dragIndex === null || !currentPlaylist || !currentPlaylistId) return;
    const tracks = [...currentPlaylist.tracks];
    const [moved] = tracks.splice(dragIndex, 1);
    tracks.splice(targetIndex, 0, moved);
    reorderTracks(currentPlaylistId, tracks);
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, currentPlaylist, currentPlaylistId, reorderTracks]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  if (!currentPlaylist) {
    return (
      <div className="playlist-view active">
        <div className="empty-state">
          <FolderOpen className="empty-icon text-sub" size={64} />
          <p>{t.emptyPlaylist}</p>
          <span className="empty-hint">{t.emptyPlaylistHint}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="playlist-view active">
      <div className="playlist-header user-playlist-header">
        <div className="user-playlist-banner">
          <span className="user-playlist-icon-large">{currentPlaylist.icon}</span>
          <div className="user-playlist-info">
            <h2>{currentPlaylist.name}</h2>
            <p>{currentPlaylist.tracks.length} {t.tracksCount}</p>
          </div>
          <button
            className="delete-playlist-btn"
            onClick={() => deletePlaylist(currentPlaylist.id)}
            title={t.delete}
          ><Trash2 size={20} /></button>
        </div>
      </div>
      <div className="tracks-list">
        {enrichedTracks.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">{currentPlaylist.icon}</span>
            <p>{t.emptyPlaylist}</p>
            <span className="empty-hint">{t.emptyPlaylistHint}</span>
          </div>
        ) : (
          enrichedTracks.map((track, i) => {
            const isDragging = dragIndex === i;
            const isDragOver = dragOverIndex === i && dragIndex !== i;
            const dragCls = [
              isDragging ? 'dragging' : '',
              isDragOver ? (dragIndex !== null && i > dragIndex ? 'drag-over-bottom' : 'drag-over-top') : '',
            ].filter(Boolean).join(' ');

            return (
              <PlayableTrackItem
                key={track.id}
                track={track}
                index={i}
                contextType="userPlaylist"
                playlistId={currentPlaylistId || undefined}
                showDragHandle
                draggable
                dragClass={dragCls}
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
                onPlay={() => handlePlayTrack(i)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
