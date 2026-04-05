import type { SourceType } from '@/lib/types';

const API_BASE = '/api';

export interface SearchResult {
  id: string;
  title: string;
  artist: string;
  duration: string;
  duration_sec?: number;
  url: string;
  thumbnail?: string;
  source: SourceType;
}

export interface DownloadResult {
  success: boolean;
  source: string;
  filename?: string;
  title?: string;
  artist?: string;
  duration?: number;
  stream_url?: string;
  error?: string;
}

export interface LibraryTrack {
  filename: string;
  title: string;
  size_mb: number;
  format?: string;
  stream_url: string;
}

class MusicApi {
  private async request<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${window.location.origin}${API_BASE}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      let message = res.statusText || 'Request failed';
      try {
        const data = await res.json() as { detail?: string };
        if (typeof data.detail === 'string' && data.detail.trim()) {
          message = data.detail;
        }
      } catch {
        const errorText = await res.text().catch(() => '');
        if (errorText.trim()) {
          message = errorText;
        }
      }
      throw new Error(message);
    }
    return res.json();
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.request('/health');
      return true;
    } catch {
      return false;
    }
  }

  async search(query: string, source: SourceType = 'youtube'): Promise<SearchResult[]> {
    const data = await this.request<{ results: SearchResult[] }>('/search', {
      query,
      source,
    });
    return data.results || [];
  }

  async download(url: string, source: SourceType = 'youtube'): Promise<DownloadResult> {
    return this.request<DownloadResult>('/download', { url, source });
  }

  getStreamUrl(filename: string): string {
    return `${API_BASE}/stream/${encodeURIComponent(filename)}`;
  }

  async getLibrary(): Promise<{
    tracks: LibraryTrack[];
    total: number;
  }> {
    return this.request('/library');
  }

  async deleteLibraryTrack(filename: string): Promise<{ success: boolean; filename: string }> {
    const url = new URL(`${window.location.origin}${API_BASE}/library/${encodeURIComponent(filename)}`);
    const res = await fetch(url.toString(), {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      let message = res.statusText || 'Request failed';
      try {
        const data = await res.json() as { detail?: string };
        if (typeof data.detail === 'string' && data.detail.trim()) {
          message = data.detail;
        }
      } catch {
        const errorText = await res.text().catch(() => '');
        if (errorText.trim()) {
          message = errorText;
        }
      }
      throw new Error(message);
    }
    return res.json();
  }
}

export const api = new MusicApi();

export function detectSource(input: string): SourceType | null {
  const lower = input.toLowerCase().trim();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('spotify.com')) return 'spotify';
  if (lower.includes('music.yandex') || lower.includes('yandex.ru/music')) return 'yandex';
  return null;
}

export function isUrl(input: string): boolean {
  return /^https?:\/\//i.test(input.trim());
}
