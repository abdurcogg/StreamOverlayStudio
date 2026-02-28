import { useState } from 'react';
import { triggerMedia } from '../lib/channel';

export default function MediaCard({ config, onEdit, onDelete }) {
  const [triggered, setTriggered] = useState(false);

  const handleTrigger = () => {
    setTriggered(true);
    triggerMedia(config.id);
    setTimeout(() => setTriggered(false), 1500);
  };

  const renderPreview = () => {
    if (!config.mediaUrl) {
      return <div className="no-media">🎬</div>;
    }
    if (config.mediaType === 'video') {
      return <video src={config.mediaUrl} muted loop style={{ maxWidth: '100%', maxHeight: '100%' }} />;
    }
    return <img src={config.mediaUrl} alt={config.fileName} />;
  };

  return (
    <div className="media-card">
      {/* Clickable thumbnail = play trigger */}
      <div
        className={`preview preview-clickable ${triggered ? 'preview-triggered' : ''}`}
        onClick={handleTrigger}
        title="Click to trigger overlay"
      >
        {renderPreview()}
        <div className="preview-play-overlay">
          {triggered ? (
            <span className="trigger-flash">✨ Triggered!</span>
          ) : (
            <span className="play-icon-circle">▶</span>
          )}
        </div>
      </div>
      <div className="card-body">
        <div className="card-title" title={config.title || config.fileName}>
          {config.title || config.fileName}
        </div>
        <div className="card-meta">
          <span>🎭 {config.animationIn}</span>
          <span>⏱️ {config.duration}s</span>
          <span>📐 {config.scale}%</span>
          {config.sfxUrl && <span>🔊 SFX</span>}
        </div>
        <div className="card-actions">
          <button className="btn btn-edit" onClick={() => onEdit(config)}>
            ✏️ Edit
          </button>
          <button className="btn btn-delete" onClick={() => onDelete(config.id)}>
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
}
