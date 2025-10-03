import React, { useEffect, useState } from 'react';
import CollabEditor from './collabEditor';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room') || 'default-room';

  const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
  const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved ? saved : (prefersDark ? 'dark' : 'light');

  const [theme, setTheme] = useState(initial);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div className="app-container">
      <div className="header-row" style={{ marginBottom: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>CRDT Collaborative Editor</h1>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Room: <strong>{room}</strong></div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="toggle-btn"
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>

      <div className="panel">
        <CollabEditor docName={room} />
      </div>
    </div>
  );
}
