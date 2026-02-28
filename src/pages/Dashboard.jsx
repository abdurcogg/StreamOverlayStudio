import { useState, useEffect, useCallback } from 'react';
import { loadMediaConfigs, addMediaConfig, updateMediaConfig, deleteMediaConfig } from '../lib/store';
import MediaCard from '../components/MediaCard';
import MediaConfigModal from '../components/MediaConfigModal';

export default function Dashboard() {
  const [configs, setConfigs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);

  const widgetUrl = `${window.location.origin}/widget`;

  useEffect(() => {
    setConfigs(loadMediaConfigs());
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(widgetUrl);
      setCopied(true);
      showToast('Widget URL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
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

  const handleAddNew = () => {
    setEditingConfig(null);
    setShowModal(true);
  };

  const handleEdit = (config) => {
    setEditingConfig(config);
    setShowModal(true);
  };

  const handleSave = (formData) => {
    if (editingConfig?.id) {
      updateMediaConfig(editingConfig.id, formData);
      showToast('Media updated successfully!');
    } else {
      addMediaConfig(formData);
      showToast('Media added successfully!');
    }
    setConfigs(loadMediaConfigs());
    setShowModal(false);
    setEditingConfig(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this media?')) {
      deleteMediaConfig(id);
      setConfigs(loadMediaConfigs());
      showToast('Media deleted', 'error');
    }
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>🎮 Stream Overlay Studio</h1>
          <div className="subtitle">Create custom media overlays for your stream — Copy the widget URL into OBS as a Browser Source</div>
        </div>
        <button className="btn btn-primary" onClick={handleAddNew}>
          ✨ Add Media
        </button>
      </div>

      {/* Widget URL Bar */}
      <div className="widget-url-bar">
        <div className="label">📡 Widget URL</div>
        <div className="url-text">{widgetUrl}</div>
        <button
          className={`btn btn-copy ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
        >
          {copied ? '✅ Copied!' : '📋 Copy URL'}
        </button>
      </div>

      {/* Media Grid */}
      {configs.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">🎬</div>
          <p>No media configured yet. Click <strong>"Add Media"</strong> to get started!</p>
        </div>
      ) : null}

      <div className="media-grid">
        {configs.map((config) => (
          <MediaCard
            key={config.id}
            config={config}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
        <div className="add-card" onClick={handleAddNew}>
          <div className="plus-icon">+</div>
          <span>Add New Media</span>
        </div>
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
