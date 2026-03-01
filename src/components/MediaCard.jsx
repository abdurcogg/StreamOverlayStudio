import { useState, useRef } from 'react';
import { triggerMedia } from '../lib/channel';

export default function MediaCard({ config, onEdit, onDelete }) {
  const [triggered, setTriggered] = useState(false);
  const videoRef = useRef(null);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleTrigger = () => {
    setTriggered(true);
    triggerMedia(config.id);
    setTimeout(() => setTriggered(false), 1500);
  };

  const renderPreview = () => {
    if (!config.mediaUrl) {
      return <div className="no-media">No Media</div>;
    }
    if (config.mediaType === 'video') {
      return <video ref={videoRef} src={config.mediaUrl} playsInline muted loop style={{ maxWidth: '100%', maxHeight: '100%' }} />;
    }
    return <img src={config.mediaUrl} alt={config.fileName} />;
  };

  return (
    <div
      className={`media-card ${triggered ? 'triggered' : ''} ${config.visible === false ? 'is-hidden' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ opacity: config.visible === false ? 0.6 : 1 }}
    >
      {/* Clickable thumbnail = play trigger */}
      <div
        className="preview preview-clickable"
        onClick={handleTrigger}
        title="Click to trigger overlay"
      >
        {renderPreview()}
        {triggered && (
          <div className="preview-trigger-flash">
            Triggered!
          </div>
        )}
      </div>
      <div className="card-body">
        <div className="card-title" title={config.title || config.fileName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{config.title || config.fileName}</span>
          {config.visible === false && (
            <span style={{ fontSize: '10px', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>Hidden</span>
          )}
        </div>
        <div className="card-meta">
          <>
            <span>Animation: {config.animationIn}</span>
            <span>Time: {config.duration}s</span>
          </>
          <span>Scale: {config.scale}%</span>
          <span>Pos: {Math.round(config.position?.x || 0)}, {Math.round(config.position?.y || 0)}</span>
          {config.sfxUrl && <span>Sound: SFX</span>}
        </div>
        <div className="card-actions">
          <button className="btn btn-edit" onClick={() => onEdit(config)}>
            Edit
          </button>
          <button className="btn btn-delete" onClick={() => onDelete(config.id)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
