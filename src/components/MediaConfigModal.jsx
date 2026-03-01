import { useState, useEffect } from 'react';
import { ANIMATION_OPTIONS, ANIMATION_OUT_OPTIONS } from '../lib/store';
import PositionEditor from './PositionEditor';

export default function MediaConfigModal({ config, onSave, onClose }) {
  const [form, setForm] = useState({
    title: '',
    mediaUrl: '',
    mediaType: 'image',
    fileName: '',
    animationIn: 'fadeIn',
    animationOut: 'fadeOut',
    animationInSpeed: 0.5,
    animationOutSpeed: 0.5,
    duration: 5,
    crop: { top: 0, bottom: 0, left: 0, right: 0 },
    position: { x: 760, y: 340 },
    scale: 100,
    maxWidth: 400,
    maxHeight: 400,
    naturalWidth: 400,
    naturalHeight: 400,
    volume: 80,
    sfxUrl: '',
    sfxFileName: '',
    sfxVolume: 80,
    ...config,
  });

  const update = (changes) => setForm(prev => ({ ...prev, ...changes }));

  // Auto-detect media dimensions when file is loaded
  const detectMediaSize = (url, type) => {
    if (type === 'video') {
      const video = document.createElement('video');
      video.src = url;
      video.onloadedmetadata = () => {
        // Auto-detect duration: use real video duration, capped at 30s
        const realDuration = video.duration;
        const autoDuration = (realDuration && isFinite(realDuration))
          ? Math.min(Math.ceil(realDuration), 30)
          : 5;
        update({
          naturalWidth: video.videoWidth,
          naturalHeight: video.videoHeight,
          maxWidth: Math.min(video.videoWidth, 1920),
          maxHeight: Math.min(video.videoHeight, 1080),
          duration: autoDuration,
        });
      };
    } else {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        update({
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          maxWidth: Math.min(img.naturalWidth, 1920),
          maxHeight: Math.min(img.naturalHeight, 1080),
        });
      };
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      let mediaType = 'image';
      if (file.type.startsWith('video/')) {
        mediaType = 'video';
        if (file.size > 8 * 1024 * 1024) {
          alert('Warning: Video size is over 8MB! For fast triggers, keeping short memes under 5MB is highly recommended.');
        }
      } else if (file.name.endsWith('.gif')) {
        mediaType = 'gif';
      }

      const url = ev.target.result;
      update({
        mediaUrl: url,
        mediaType,
        fileName: file.name,
        title: file.name, // Auto-fill title with filename initially
      });
      detectMediaSize(url, mediaType);
    };
    reader.readAsDataURL(file);
  };

  const handleSfxChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      update({
        sfxUrl: ev.target.result,
        sfxFileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!form.mediaUrl) return;
    onSave(form);
  };

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>{config?.id ? 'Edit Media' : 'Add New Media'}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* File Upload / Preview */}
          {form.mediaUrl ? (
            <>
              <div className="form-label">Media Preview</div>
              <div className="media-preview-box" style={{ overflow: 'hidden' }}>
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  clipPath: `inset(${form.crop?.top || 0}% ${form.crop?.right || 0}% ${form.crop?.bottom || 0}% ${form.crop?.left || 0}%)`
                }}>
                  {form.mediaType === 'video'
                    ? <video src={form.mediaUrl} controls muted style={{ maxWidth: '100%', maxHeight: '100%' }} />
                    : <img src={form.mediaUrl} alt={form.fileName} />
                  }
                </div>
              </div>
              <div className="file-name-text">
                {form.fileName}
                {form.naturalWidth > 0 && (
                  <span style={{ marginLeft: 8, color: 'var(--accent-cyan)' }}>
                    ({form.naturalWidth}×{form.naturalHeight}px)
                  </span>
                )}
                <button
                  className="btn btn-ghost"
                  style={{ marginLeft: 12, padding: '4px 10px', fontSize: 11 }}
                  onClick={() => update({ mediaUrl: '', fileName: '', mediaType: 'image', naturalWidth: 400, naturalHeight: 400 })}
                >
                  Change File
                </button>
              </div>
            </>
          ) : (
            <div className="form-group">
              <label className="form-label">Upload Media (Image / Video / GIF)</label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="form-input"
                style={{ padding: '8px' }}
              />
            </div>
          )}

          {/* Title Input */}
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Media Title</label>
            <input
              type="text"
              className="form-input"
              value={form.title || form.fileName}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="e.g. My Overlay"
            />
          </div>

          {/* Crop Settings */}
          {form.mediaUrl && (
            <div className="form-group" style={{ marginTop: '16px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <label className="form-label" style={{ marginBottom: 12 }}>✂️ Crop Media (%)</label>
              
              <div className="form-row" style={{ gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Top ({form.crop?.top || 0}%)</div>
                  <input type="range" min="0" max="50" value={form.crop?.top || 0} onChange={(e) => update({ crop: { ...form.crop, top: Number(e.target.value) } })} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Bottom ({form.crop?.bottom || 0}%)</div>
                  <input type="range" min="0" max="50" value={form.crop?.bottom || 0} onChange={(e) => update({ crop: { ...form.crop, bottom: Number(e.target.value) } })} style={{ width: '100%' }} />
                </div>
              </div>

              <div className="form-row" style={{ gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Left ({form.crop?.left || 0}%)</div>
                  <input type="range" min="0" max="50" value={form.crop?.left || 0} onChange={(e) => update({ crop: { ...form.crop, left: Number(e.target.value) } })} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Right ({form.crop?.right || 0}%)</div>
                  <input type="range" min="0" max="50" value={form.crop?.right || 0} onChange={(e) => update({ crop: { ...form.crop, right: Number(e.target.value) } })} style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          )}

          {/* SFX Sound Upload */}
          <div className="form-group sfx-section">
            <label className="form-label">Sound Effect (SFX) — plays when overlay appears</label>
            {form.sfxUrl ? (
              <div className="sfx-preview">
                <div className="sfx-info">
                  <span className="sfx-name">{form.sfxFileName}</span>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={() => update({ sfxUrl: '', sfxFileName: '' })}
                  >
                    Remove
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '4px 10px', fontSize: 11, marginLeft: 4 }}
                    onClick={() => {
                      const a = new Audio(form.sfxUrl);
                      a.volume = form.sfxVolume / 100;
                      a.play();
                    }}
                  >
                    Test
                  </button>
                </div>
                <div style={{ marginTop: 8 }}>
                  <label className="form-label" style={{ marginBottom: 4 }}>SFX Volume</label>
                  <div className="slider-container">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={form.sfxVolume}
                      onChange={(e) => update({ sfxVolume: parseInt(e.target.value) })}
                    />
                    <span className="slider-value">{form.sfxVolume}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <input
                type="file"
                accept="audio/*"
                onChange={handleSfxChange}
                className="form-input"
                style={{ padding: '8px' }}
              />
            )}
          </div>

          {/* Animation Settings */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Appear Animation</label>
              <select
                className="form-select"
                value={form.animationIn}
                onChange={(e) => update({ animationIn: e.target.value })}
              >
                {ANIMATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Disappear Animation</label>
              <select
                className="form-select"
                value={form.animationOut}
                onChange={(e) => update({ animationOut: e.target.value })}
              >
                {ANIMATION_OUT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Speed Sliders */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Appear Speed</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={form.animationInSpeed}
                  onChange={(e) => update({ animationInSpeed: parseFloat(e.target.value) })}
                />
                <span className="slider-value">{form.animationInSpeed}s</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Disappear Speed</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={form.animationOutSpeed}
                  onChange={(e) => update({ animationOutSpeed: parseFloat(e.target.value) })}
                />
                <span className="slider-value">{form.animationOutSpeed}s</span>
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="form-group">
            <label className="form-label">Duration / Auto-Hide (seconds)</label>
            <div className="slider-container">
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={form.duration}
                onChange={(e) => update({ duration: parseInt(e.target.value) })}
              />
              <span className="slider-value">{form.duration}s</span>
            </div>
          </div>

          {/* Volume (for video) */}
          {(form.mediaType === 'video') && (
            <div className="form-group">
              <label className="form-label">Media Volume</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={form.volume}
                  onChange={(e) => update({ volume: parseInt(e.target.value) })}
                />
                <span className="slider-value">{form.volume}%</span>
              </div>
            </div>
          )}

          {/* Position Editor */}
          <PositionEditor
            config={form}
            onChange={(changes) => update(changes)}
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!form.mediaUrl}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
