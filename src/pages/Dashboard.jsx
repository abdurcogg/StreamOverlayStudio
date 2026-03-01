import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { loadMediaConfigs, addMediaConfig, updateMediaConfig, deleteMediaConfig } from '../lib/store';
import MediaCard from '../components/MediaCard';
import MediaConfigModal from '../components/MediaConfigModal';

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [loadingText, setLoadingText] = useState('Checking authentication...');
  
  const [configs, setConfigs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setLoadingText('Loading your media configs...');
        fetchConfigs();
      } else {
        setLoadingText('');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchConfigs();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchConfigs = async () => {
    const data = await loadMediaConfigs('reacts');
    setConfigs(data);
    setLoadingText('');
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) alert('Error logging in: ' + error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setConfigs([]);
  };

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  if (loadingText && !session) {
    return (
      <div className="dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>{loadingText}</p>
      </div>
    );
  }

  // --- LOGIN SCREEN ---
  if (!session) {
    return (
      <div className="dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', background: 'var(--bg-card)', padding: '40px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>ReactS Studio</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Manage your OBS overlays and trigger them from anywhere (like a Stream Deck).</p>
          <button className="btn btn-primary" onClick={handleLogin} style={{ padding: '12px 24px', fontSize: 16 }}>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD (Authenticated) ---
  const widgetUrl = `${window.location.origin}/widget?uid=${session.user.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(widgetUrl);
      setCopied(true);
      showToast('Widget URL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = widgetUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      showToast('Widget URL copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async (formData) => {
    setLoadingText('Saving configuration to cloud...');
    try {
      if (editingConfig?.id) {
        await updateMediaConfig(editingConfig.id, formData);
        showToast('Media updated successfully!');
      } else {
        await addMediaConfig(formData, 'reacts');
        showToast('Media added successfully!');
      }
      await fetchConfigs();
    } catch (err) {
      showToast('Error saving: ' + err.message, 'error');
    }
    setLoadingText('');
    setShowModal(false);
    setEditingConfig(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this media?')) {
      setLoadingText('Deleting...');
      try {
        await deleteMediaConfig(id);
        await fetchConfigs();
        showToast('Media deleted', 'error');
      } catch (err) {
        showToast('Delete failed: ' + err.message, 'error');
      }
      setLoadingText('');
    }
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1>ReactS Dashboard</h1>
            <a href="/overlays" className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 10px' }}>Go to OverlayS</a>
          </div>
          <div className="subtitle">Logged in as {session.user.email} &bull; <button className="btn-ghost" onClick={handleLogout} style={{ border: 'none', cursor: 'pointer', padding: 0 }}>Logout</button></div>
        </div>
        <div className="header-actions">
          {/* TikTok */}
          <a
            href="https://www.tiktok.com/@abdurcog"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-social btn-tiktok"
            title="Follow on TikTok"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
            </svg>
          </a>
          {/* Instagram */}
          <a
            href="https://www.instagram.com/abdurcog"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-social btn-instagram"
            title="Follow on Instagram"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.25-2.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/>
            </svg>
          </a>
          {/* Saweria Donate */}
          <a
            href="https://saweria.co/abdurcogg"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-donate"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            Donate
          </a>
          <button className="btn btn-primary" onClick={() => { setEditingConfig(null); setShowModal(true); }}>
            Add Media
          </button>
        </div>
      </div>

      {loadingText && (
        <div style={{ textAlign: 'center', padding: '10px', color: 'var(--accent-cyan)', background: 'var(--accent-cyan-dim)', borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
          {loadingText}
        </div>
      )}

      {/* Widget URL Bar */}
      <div className="widget-url-bar">
        <div className="label">ReactS Widget URL</div>
        <div className="url-text">{widgetUrl}</div>
        <button
          className={`btn btn-copy ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
        >
          {copied ? 'Copied!' : 'Copy URL'}
        </button>
      </div>

      {/* Media Grid */}
      {configs.length === 0 && !loadingText ? (
        <div className="empty-state">
          <p>No interactive media configured yet. Click <strong>"Add Media"</strong> to get started!</p>
        </div>
      ) : null}

      <div className="media-grid">
        {configs.map((config) => (
          <MediaCard
            key={config.id}
            config={config}
            onEdit={(cfg) => { setEditingConfig(cfg); setShowModal(true); }}
            onDelete={handleDelete}
          />
        ))}
        {!loadingText && (
          <div className="add-card" onClick={() => { setEditingConfig(null); setShowModal(true); }}>
            <div className="plus-icon">+</div>
            <span>Add New Media</span>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <MediaConfigModal
          config={editingConfig}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingConfig(null); }}
          defaultType="reacts"
          canvasPreset="youtube"
        />
      )}

      {/* Footer Credits */}
      <div className="dashboard-footer">
        <a href="https://www.instagram.com/abdurcog" target="_blank" rel="noopener noreferrer" className="credit-link">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.25-2.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/>
          </svg>
          Made by @abdurcog
        </a>
        <span className="credit-divider">•</span>
        <a href="https://www.instagram.com/kurohiko_id" target="_blank" rel="noopener noreferrer" className="credit-link">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.25-2.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/>
          </svg>
          Inspired by @kurohiko_id
        </a>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
