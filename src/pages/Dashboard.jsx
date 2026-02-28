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
    const data = await loadMediaConfigs();
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
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>Stream Overlay Studio</h1>
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
        await addMediaConfig(formData);
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
          <h1>Stream Overlay Studio</h1>
          <div className="subtitle">Logged in as {session.user.email} &bull; <button className="btn-ghost" onClick={handleLogout} style={{ border: 'none', cursor: 'pointer', padding: 0 }}>Logout</button></div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingConfig(null); setShowModal(true); }}>
          Add Media
        </button>
      </div>

      {loadingText && (
        <div style={{ textAlign: 'center', padding: '10px', color: 'var(--accent-cyan)', background: 'var(--accent-cyan-dim)', borderRadius: 'var(--radius-sm)', marginBottom: 20 }}>
          {loadingText}
        </div>
      )}

      {/* Widget URL Bar */}
      <div className="widget-url-bar">
        <div className="label">OBS Widget URL</div>
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
          <p>No media configured yet. Click <strong>"Add Media"</strong> to get started!</p>
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
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
