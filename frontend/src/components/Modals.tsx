import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';

const ICONS = ['🎵', '🎸', '🎹', '🎷', '🥁', '🎤', '🌙', '☀️', '🔥', '💪', '🎉', '💜', '🌊', '⭐', '🚀'];

export function CreatePlaylistModal() {
  const { t, createPlaylist } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎵');

  useEffect(() => {
    const handler = () => {
      setOpen(true);
      setName('');
      setIcon('🎵');
    };
    window.addEventListener('openCreatePlaylistModal', handler);
    return () => window.removeEventListener('openCreatePlaylistModal', handler);
  }, []);

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;
    createPlaylist(name.trim(), icon);
    setOpen(false);
  }, [name, icon, createPlaylist]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
  }, [handleCreate]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>{t.createPlaylistTitle}</h2>
          <button className="modal-close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>{t.playlistNameLabel}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.enterPlaylistName}
              maxLength={100}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>{t.playlistIconLabel}</label>
            <div className="icon-picker">
              {ICONS.map(ic => (
                <button
                  key={ic}
                  className={`icon-option ${icon === ic ? 'selected' : ''}`}
                  onClick={() => setIcon(ic)}
                >{ic}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => setOpen(false)}>{t.cancel}</button>
          <button className="btn-primary" onClick={handleCreate}>{t.create}</button>
        </div>
      </div>
    </div>
  );
}

export function AddToPlaylistModal() {
  const { t, playlists, addToPlaylist, findTrack, showToast } = useApp();
  const [open, setOpen] = useState(false);
  const [trackId, setTrackId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setTrackId(customEvent.detail);
      setOpen(true);
    };
    window.addEventListener('openAddToPlaylistModal', handler);
    return () => window.removeEventListener('openAddToPlaylistModal', handler);
  }, []);

  const handleAdd = useCallback((playlistId: string) => {
    if (!trackId) return;
    const track = findTrack(trackId);
    if (track) {
      addToPlaylist(playlistId, track);
    } else {
      showToast(t.trackNotFound, 'error');
    }
    setOpen(false);
  }, [trackId, findTrack, addToPlaylist, showToast, t]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>{t.addToPlaylistTitle}</h2>
          <button className="modal-close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="modal-body">
          <div className="playlists-select">
            {playlists.length === 0 ? (
              <p className="no-playlists-msg">{t.noPlaylists}</p>
            ) : (
              playlists.map(p => (
                <div
                  key={p.id}
                  className="playlist-select-item"
                  onClick={() => handleAdd(p.id)}
                >
                  <span className="playlist-icon">{p.icon}</span>
                  <span className="playlist-name">{p.name}</span>
                  <span className="playlist-count">{p.tracks.length}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
