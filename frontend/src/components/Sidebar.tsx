import { useApp } from '@/context/AppContext';
import { Music, Home, FolderOpen, Heart, Download, Plus } from 'lucide-react';

export function Sidebar() {
  const {
    t, activeView, setActiveView, favorites, downloaded,
    playlists, openPlaylist, openSystemPlaylist, goHome,
    currentPlaylistId, setActivePlaylistTab,
  } = useApp();

  const showCreateModal = () => {
    window.dispatchEvent(new CustomEvent('openCreatePlaylistModal'));
  };

  return (
    <aside className="sidebar">
      <div className="logo" role="button" tabIndex={0} onClick={goHome}>
        <Music className="logo-icon text-accent" size={32} />
        <span className="logo-text">FreeMusic</span>
      </div>

      <nav className="nav-main">
        <button
          className={`nav-item ${activeView === 'listen' ? 'active' : ''}`}
          onClick={() => { setActiveView('listen'); setActivePlaylistTab('all'); }}
        >
          <Home className="nav-icon" size={20} />
          <span className="nav-label">{t.listenTitle}</span>
        </button>
        <button
          className={`nav-item ${activeView === 'playlists' ? 'active' : ''}`}
          onClick={() => { setActiveView('playlists'); setActivePlaylistTab('all'); }}
        >
          <FolderOpen className="nav-icon" size={20} />
          <span className="nav-label">{t.playlistTitle}</span>
        </button>
      </nav>

      <div className="sidebar-section">
        <div className="section-title">{t.library}</div>

        <div className="playlist-list system-playlists">
          <div
            className="playlist-item"
            role="button"
            tabIndex={0}
            onClick={() => openSystemPlaylist('favorites')}
          >
            <Heart className="playlist-icon favorites-icon" size={18} />
            <span className="playlist-name">{t.favorites}</span>
            <span className="playlist-count">{favorites.length}</span>
          </div>
          <div
            className="playlist-item"
            role="button"
            tabIndex={0}
            onClick={() => openSystemPlaylist('downloaded')}
          >
            <Download className="playlist-icon downloaded-icon" size={18} />
            <span className="playlist-name">{t.downloaded}</span>
            <span className="playlist-count">{downloaded.length}</span>
          </div>
        </div>

        <div className="playlist-divider">
          <span className="divider-line" />
          <span className="divider-text">{t.userPlaylists}</span>
          <span className="divider-line" />
        </div>

        <div className="playlist-list user-playlists">
          {playlists.map(p => (
            <div
              key={p.id}
              className={`playlist-item ${currentPlaylistId === p.id ? 'active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => openPlaylist(p.id)}
            >
              <span className="playlist-icon" style={{fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{p.icon}</span>
              <span className="playlist-name">{p.name}</span>
              <span className="playlist-count">{p.tracks.length}</span>
            </div>
          ))}
        </div>

        <button className="add-playlist-btn" onClick={showCreateModal}>
          <div className="plus-icon"><Plus size={16} /></div>
          <span>{t.createPlaylist}</span>
        </button>
      </div>
    </aside>
  );
}
