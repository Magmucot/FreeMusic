import { useApp } from '@/context/AppContext';
import { Sun, Moon, User } from 'lucide-react';

export function Topbar() {
  const { lang, setLang, theme, toggleTheme } = useApp();

  return (
    <header className="topbar">
      <div className="topbar-spacer" />
      <div className="topbar-actions">
        <button
          className="icon-btn"
          title="Language"
          onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
        >
          <span className="lang-text">{lang === 'ru' ? 'EN' : 'RU'}</span>
        </button>
        <button
          className="icon-btn"
          title="Theme"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <div className="user-avatar" role="button" tabIndex={0}>
          <User size={20} color="white" />
        </div>
      </div>
    </header>
  );
}
