export interface TrackInfo {
  id: string;
  name: string;
  artist: string;
  duration: string;
  addedAt?: string;
  url?: string;
  thumbnail?: string;
  source?: SourceType;
  filename?: string;
}

export interface PlaylistInfo {
  id: string;
  name: string;
  icon: string;
  tracks: TrackInfo[];
  createdAt: string;
}

export type Lang = 'ru' | 'en';
export type Theme = 'dark' | 'light';
export type SortType = 'name' | 'artist' | 'date' | 'duration';
export type SortDir = 'asc' | 'desc';
export type ActiveView = 'listen' | 'playlists';
export type PlaylistTab = 'all' | 'favorites' | 'downloaded' | 'userPlaylist';
export type SourceType = 'youtube' | 'spotify' | 'yandex';

export interface SourceInfo {
  id: SourceType;
  name: string;
  icon: string;
  color: string;
  available: boolean;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error';
}
