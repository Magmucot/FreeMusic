import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type {
  Lang, Theme, SortType, SortDir, ActiveView, PlaylistTab,
  TrackInfo, PlaylistInfo, ToastMessage,
} from '@/lib/types';
import { translations, type Translations } from '@/lib/i18n';
import { api } from '@/lib/api';

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

// Demo data
const DEMO_TRACKS: TrackInfo[] = [
  { id: 'demo_1', name: 'Midnight City', artist: 'M83', duration: '3:24' },
  { id: 'demo_2', name: 'Blinding Lights', artist: 'The Weeknd', duration: '4:12' },
  { id: 'demo_3', name: 'Bohemian Rhapsody', artist: 'Queen', duration: '5:58' },
];

const RECENT_TRACKS: TrackInfo[] = [
  { id: 'recent_1', name: 'Summer Nights', artist: 'Chill Beats', duration: '3:45' },
  { id: 'recent_2', name: 'Midnight Dreams', artist: 'Lo-Fi Studio', duration: '4:20' },
  { id: 'recent_3', name: 'Ocean Waves', artist: 'Nature Sounds', duration: '5:10' },
];

interface NowPlaying {
  track: TrackInfo;
  streamUrl: string;
}

interface AppContextType {
  lang: Lang;
  theme: Theme;
  isPlaying: boolean;
  favorites: string[];
  downloaded: string[];
  playlists: PlaylistInfo[];
  currentPlaylistId: string | null;
  currentTrackId: string | null;
  activeView: ActiveView;
  activePlaylistTab: PlaylistTab;
  sortType: SortType;
  sortDir: SortDir;
  toasts: ToastMessage[];
  demoTracks: TrackInfo[];
  recentTracks: TrackInfo[];
  audioRef: React.RefObject<HTMLAudioElement | null>;
  nowPlaying: NowPlaying | null;
  queue: TrackInfo[];
  queueIndex: number;

  t: Translations;
  isFavorite: (id: string) => boolean;
  isDownloaded: (id: string) => boolean;
  currentPlaylist: PlaylistInfo | null;

  setLang: (lang: Lang) => void;
  toggleTheme: () => void;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  toggleFavorite: (id: string) => void;
  addDownloaded: (id: string) => void;
  removeDownloaded: (id: string) => void;
  createPlaylist: (name: string, icon: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, track: TrackInfo) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  removeFromRegistry: (trackId: string) => Promise<boolean>;
  reorderTracks: (playlistId: string, newTracks: TrackInfo[]) => void;
  setActiveView: (view: ActiveView) => void;
  setActivePlaylistTab: (tab: PlaylistTab) => void;
  setCurrentPlaylistId: (id: string | null) => void;
  setCurrentTrackId: (id: string | null) => void;
  setSortType: (type: SortType) => void;
  toggleSortDir: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  removeToast: (id: string) => void;
  openPlaylist: (id: string) => void;
  openSystemPlaylist: (tab: 'favorites' | 'downloaded') => void;
  goHome: () => void;
  getAllTracks: () => TrackInfo[];
  findTrack: (id: string) => TrackInfo | undefined;
  enrichTrack: (track: TrackInfo) => TrackInfo;
  registerTrack: (track: TrackInfo) => void;
  playTrack: (track: TrackInfo, streamUrl?: string) => void;
  playQueue: (tracks: TrackInfo[], startIndex: number) => void;
  playNext: () => void;
  playPrev: () => void;
  stopPlayback: () => void;
  refreshLibrary: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

interface StoredState {
  favorites: string[];
  downloaded: string[];
  playlists: PlaylistInfo[];
  lang: Lang;
  theme: Theme;
  tracksRegistry: Record<string, TrackInfo>;
}

function loadState(): Partial<StoredState> {
  try {
    const raw = localStorage.getItem('musicApp');
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveState(state: StoredState) {
  try {
    localStorage.setItem('musicApp', JSON.stringify(state));
  } catch (e) {
    console.error('Save error:', e);
  }
}

function sanitizeLibraryTrackId(filename: string): string {
  return `lib_${filename}`;
}

function buildTrackFromLibrary(track: {
  filename: string;
  title: string;
  stream_url: string;
}, artistLabel: string): TrackInfo {
  return {
    id: sanitizeLibraryTrackId(track.filename),
    name: track.title,
    artist: artistLabel,
    duration: '0:00',
    url: track.stream_url,
    source: 'youtube',
    filename: track.filename,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const stored = useRef(loadState()).current;

  const [lang, setLangState] = useState<Lang>(stored.lang || 'ru');
  const [theme, setThemeState] = useState<Theme>(stored.theme || 'dark');
  const [isPlaying, setIsPlaying] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(stored.favorites || []);
  const [downloaded, setDownloaded] = useState<string[]>(stored.downloaded || []);
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>(stored.playlists || []);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('listen');
  const [activePlaylistTab, setActivePlaylistTab] = useState<PlaylistTab>('all');
  const [sortType, setSortType] = useState<SortType>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [tracksRegistry, setTracksRegistry] = useState<Record<string, TrackInfo>>(
    stored.tracksRegistry || {}
  );
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [queue, setQueue] = useState<TrackInfo[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const t = translations[lang];

  const refreshLibrary = useCallback(async () => {
    try {
      const data = await api.getLibrary();
      const libraryTracks = data.tracks.map(track => buildTrackFromLibrary(track, translations[lang].localLibraryArtist));

      setTracksRegistry(prev => {
        const next = { ...prev };
        for (const track of libraryTracks) {
          next[track.id] = { ...next[track.id], ...track };
        }
        return next;
      });

      setDownloaded(libraryTracks.map(track => track.id));
    } catch (e) {
      console.error('Library sync error:', e);
    }
  }, [lang]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  useEffect(() => {
    saveState({ favorites, downloaded, playlists, lang, theme, tracksRegistry });
  }, [favorites, downloaded, playlists, lang, theme, tracksRegistry]);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);
  const isDownloaded = useCallback((id: string) => downloaded.includes(id), [downloaded]);

  const currentPlaylist = playlists.find(p => p.id === currentPlaylistId) || null;

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  }, [isPlaying]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const registerTrack = useCallback((track: TrackInfo) => {
    setTracksRegistry(prev => {
      const existing = prev[track.id];
      if (existing &&
          existing.name === track.name &&
          existing.url === track.url &&
          existing.thumbnail === track.thumbnail) {
        return prev;
      }
      return { ...prev, [track.id]: { ...existing, ...track } };
    });
  }, []);

  // Enrich a track with latest data from registry
  const enrichTrack = useCallback((track: TrackInfo): TrackInfo => {
    const fromRegistry = tracksRegistry[track.id];
    if (!fromRegistry) return track;
    // Merge: registry has latest url/thumbnail, track may have playlist-specific data
    return {
      ...track,
      url: fromRegistry.url || track.url,
      thumbnail: fromRegistry.thumbnail || track.thumbnail,
      duration: fromRegistry.duration && fromRegistry.duration !== '0:00' ? fromRegistry.duration : track.duration,
      name: fromRegistry.name || track.name,
      artist: fromRegistry.artist || track.artist,
    };
  }, [tracksRegistry]);

  // Global play function — can be called from anywhere
  const playTrack = useCallback((track: TrackInfo, streamUrl?: string) => {
    const url = streamUrl || track.url;
    if (!url) {
      showToast(translations[lang].trackUnavailable, 'error');
      return;
    }

    registerTrack(track);

    setNowPlaying({ track, streamUrl: url });
    setCurrentTrackId(track.id);

    const audio = audioRef.current;
    if (audio) {
      audio.src = url;
      audio.load();
      const onReady = () => {
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {});
        audio.removeEventListener('canplay', onReady);
      };
      audio.addEventListener('canplay', onReady);
    }
  }, [registerTrack, showToast, lang]);

  const playQueue = useCallback((tracks: TrackInfo[], startIndex: number) => {
    if (tracks.length === 0 || startIndex < 0 || startIndex >= tracks.length) return;
    setQueue(tracks);
    setQueueIndex(startIndex);
    const track = tracks[startIndex];
    const url = track.url || (track.filename ? api.getStreamUrl(track.filename) : undefined);
    playTrack(track, url);
  }, [playTrack]);

  const playNext = useCallback(() => {
    setQueueIndex(prev => {
      const nextIndex = prev + 1;
      if (nextIndex < queue.length) {
        const track = queue[nextIndex];
        const url = track.url || (track.filename ? api.getStreamUrl(track.filename) : undefined);
        playTrack(track, url);
        return nextIndex;
      }
      return prev; // Or wrap around if repeat all is enabled
    });
  }, [queue, playTrack]);

  const playPrev = useCallback(() => {
    setQueueIndex(prev => {
      const nextIndex = prev - 1;
      if (nextIndex >= 0) {
        const track = queue[nextIndex];
        const url = track.url || (track.filename ? api.getStreamUrl(track.filename) : undefined);
        playTrack(track, url);
        return nextIndex;
      }
      return 0; // Stick to first
    });
  }, [queue, playTrack]);

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    setNowPlaying(null);
    setIsPlaying(false);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      if (prev.includes(id)) {
        showToast(translations[lang].removedFromFavorites, 'error');
        return prev.filter(x => x !== id);
      } else {
        showToast(translations[lang].addedToFavorites);
        return [...prev, id];
      }
    });
  }, [showToast, lang]);

  const addDownloaded = useCallback((id: string) => {
    setDownloaded(prev => {
      if (prev.includes(id)) return prev;
      showToast(translations[lang].addedToDownloaded);
      return [...prev, id];
    });
  }, [showToast, lang]);

  const removeDownloaded = useCallback((id: string) => {
    setDownloaded(prev => {
      if (!prev.includes(id)) return prev;
      showToast(translations[lang].trackRemoved, 'error');
      return prev.filter(x => x !== id);
    });
  }, [showToast, lang]);

  const createPlaylistAction = useCallback((name: string, icon: string) => {
    const newPlaylist: PlaylistInfo = {
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      icon,
      tracks: [],
      createdAt: new Date().toISOString(),
    };
    setPlaylists(prev => [...prev, newPlaylist]);
    showToast(translations[lang].playlistCreated);
  }, [showToast, lang]);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (currentPlaylistId === id) {
      setCurrentPlaylistId(null);
      setActivePlaylistTab('all');
    }
    showToast(translations[lang].playlistDeleted, 'error');
  }, [showToast, lang, currentPlaylistId]);

  const addToPlaylist = useCallback((playlistId: string, track: TrackInfo) => {
    registerTrack(track);
    setPlaylists(prev => prev.map(p => {
      if (p.id !== playlistId) return p;
      if (p.tracks.some(t => t.id === track.id)) return p;
      return { ...p, tracks: [...p.tracks, { ...track, addedAt: new Date().toISOString() }] };
    }));
    showToast(translations[lang].addedToPlaylist);
  }, [showToast, lang, registerTrack]);

  const removeFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id !== playlistId) return p;
      return { ...p, tracks: p.tracks.filter(t => t.id !== trackId) };
    }));
    showToast(translations[lang].trackRemoved, 'error');
  }, [showToast, lang]);

  const removeFromRegistry = useCallback(async (trackId: string) => {
    const track = tracksRegistry[trackId];
    if (!track?.filename) {
      showToast(translations[lang].trackNotFound, 'error');
      return false;
    }

    try {
      await api.deleteLibraryTrack(track.filename);
    } catch (e) {
      console.error('Delete error:', e);
      showToast(translations[lang].errorDelete, 'error');
      return false;
    }

    setTracksRegistry(prev => {
      const next = { ...prev };
      delete next[trackId];
      return next;
    });
    // Also remove from favorites/downloaded
    setFavorites(prev => prev.filter(id => id !== trackId));
    setDownloaded(prev => prev.filter(id => id !== trackId));
    // Remove from all playlists
    setPlaylists(prev => prev.map(p => ({
      ...p,
      tracks: p.tracks.filter(t => t.id !== trackId),
    })));
    // Stop playback if currently playing
    if (currentTrackId === trackId) {
      stopPlayback();
    }
    showToast(translations[lang].trackRemovedFromLibrary, 'error');
    return true;
  }, [tracksRegistry, showToast, lang, currentTrackId, stopPlayback]);

  const reorderTracks = useCallback((playlistId: string, newTracks: TrackInfo[]) => {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId ? { ...p, tracks: newTracks } : p
    ));
  }, []);

  const toggleSortDir = useCallback(() => {
    setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  const openPlaylist = useCallback((id: string) => {
    setActiveView('playlists');
    setActivePlaylistTab('userPlaylist');
    setCurrentPlaylistId(id);
  }, []);

  const openSystemPlaylist = useCallback((tab: 'favorites' | 'downloaded') => {
    setActiveView('playlists');
    setActivePlaylistTab(tab);
  }, []);

  const goHome = useCallback(() => {
    setActiveView('listen');
    setCurrentPlaylistId(null);
  }, []);

  const findTrack = useCallback((id: string): TrackInfo | undefined => {
    if (tracksRegistry[id]) return tracksRegistry[id];
    const demo = DEMO_TRACKS.find(t => t.id === id);
    if (demo) return demo;
    const recent = RECENT_TRACKS.find(t => t.id === id);
    if (recent) return recent;
    for (const pl of playlists) {
      const found = pl.tracks.find(t => t.id === id);
      if (found) return found;
    }
    return undefined;
  }, [tracksRegistry, playlists]);

  const getAllTracks = useCallback((): TrackInfo[] => {
    const all = [...DEMO_TRACKS, ...RECENT_TRACKS];
    const ids = new Set(all.map(t => t.id));
    for (const track of Object.values(tracksRegistry)) {
      if (!ids.has(track.id)) {
        all.push(track);
        ids.add(track.id);
      }
    }
    return all;
  }, [tracksRegistry]);

  const value: AppContextType = {
    lang, theme, isPlaying, favorites, downloaded, playlists,
    currentPlaylistId, currentTrackId, activeView, activePlaylistTab,
    sortType, sortDir, toasts,
    demoTracks: DEMO_TRACKS,
    recentTracks: RECENT_TRACKS,
    audioRef,
    nowPlaying,
    queue,
    queueIndex,
    t,
    isFavorite, isDownloaded, currentPlaylist,
    setLang, toggleTheme, togglePlay, setIsPlaying,
    toggleFavorite, addDownloaded, removeDownloaded,
    createPlaylist: createPlaylistAction, deletePlaylist,
    addToPlaylist, removeFromPlaylist, removeFromRegistry, reorderTracks,
    setActiveView, setActivePlaylistTab,
    setCurrentPlaylistId, setCurrentTrackId,
    setSortType, toggleSortDir,
    showToast, removeToast,
    openPlaylist, openSystemPlaylist, goHome,
    getAllTracks, findTrack, enrichTrack, registerTrack,
    playTrack, playQueue, playNext, playPrev, stopPlayback,
    refreshLibrary,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { formatTime };
