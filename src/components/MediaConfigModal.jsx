import { useState, useEffect } from 'react';
import { ANIMATION_OPTIONS, ANIMATION_OUT_OPTIONS } from '../lib/store';
import DragResizeEditor from './DragResizeEditor';

export default function MediaConfigModal({ config, onSave, onClose, defaultType = 'reacts', canvasPreset = 'youtube' }) {
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
    position: { x: 100, y: 100 },
    scale: 100,
    maxWidth: 400,
    maxHeight: 400,
    naturalWidth: 400,
    naturalHeight: 400,
    volume: 80,
    sfxUrl: '',
    sfxFileName: '',
    sfxVolume: 80,
    type: config?.id ? (config.type || 'reacts') : defaultType,
    visible: true,
    opacity: 100,
    blur: 0,
    brightness: 100,
    ...config,
  });

  const update = (changes) => setForm(prev => ({ ...prev, ...changes }));
  const isOverlay = form.type === 'overlays';

  const detectMediaSize = (url, mediaType) => {
    if (mediaType === 'video') {
      const video = document.createElement('video');
      video.src = url;
      video.onloadedmetadata = () => {
        const realDuration = video.duration;
        const autoDuration = (realDuration && isFinite(realDuration)) ? Math.min(Math.ceil(realDuration), 30) : 5;
        update({ naturalWidth: video.videoWidth, naturalHeight: video.videoHeight, maxWidth: Math.min(video.videoWidth, 1920), maxHeight: Math.min(video.videoHeight, 1080), duration: autoDuration });
      };
    } else {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        update({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, maxWidth: Math.min(img.naturalWidth, 1920), maxHeight: Math.min(img.naturalHeight, 1080) });
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
        if (file.size > 8 * 1024 * 1024) alert('Warning: Video over 8MB! Keep short memes under 5MB for smooth triggers.');
      } else if (file.name.endsWith('.gif')) {
        mediaType = 'gif';
      }
      const url = ev.target.result;
      update({ mediaUrl: url, mediaType, fileName: file.name, title: file.name });
      detectMediaSize(url, mediaType);
    };
    reader.readAsDataURL(file);
  };

  const handleSfxChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => update({ sfxUrl: ev.target.result, sfxFileName: file.name });
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!form.mediaUrl) return;
    onSave(form);
  };

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>{config?.id ? 'Edit' : 'Add'} {isOverlay ? 'Overlay' : 'React Media'}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* File Upload / Preview */}
          {form.mediaUrl ? (
            <>
              <div className="form-label">Media Preview</div>
              <div className="media-preview-box" style={{ overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', clipPath: `inset(${form.crop?.top||0}% ${form.crop?.right||0}% ${form.crop?.bottom||0}% ${form.crop?.left||0}%)` }}>
                  {form.mediaType === 'video'
                    ? <video src={form.mediaUrl} controls muted style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    : <img src={form.mediaUrl} alt={form.fileName} style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }} />
                  }
                </div>
              </div>
              <div className="file-name-text">
                {form.fileName}
                {form.naturalWidth > 0 && <span style={{ marginLeft: 8, color: 'var(--accent-cyan)' }}>({form.naturalWidth}×{form.naturalHeight}px)</span>}
                <button className="btn btn-ghost" style={{ marginLeft: 12, padding: '4px 10px', fontSize: 11 }} onClick={() => update({ mediaUrl: '', fileName: '', mediaType: 'image', naturalWidth: 400, naturalHeight: 400 })}>Change File</button>
              </div>
            </>
          ) : (
            <div className="form-group">
              <label className="form-label">Upload Media (Image / Video / GIF)</label>
              <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="form-input" style={{ padding: '8px' }} />
            </div>
          )}

          {/* Visibility */}
          <div className="form-group" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={form.visible !== false} onChange={(e) => update({ visible: e.target.checked })} style={{ width: 18, height: 18, cursor: 'pointer' }} />
            <label className="form-label" style={{ marginBottom: 0 }}>Visible in widget</label>
          </div>

          {/* Title */}
          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">Title</label>
            <input type="text" className="form-input" value={form.title || form.fileName} onChange={(e) => update({ title: e.target.value })} placeholder="e.g. My Overlay" />
          </div>

          {/* CSS Filters (OverlayS only) */}
          {isOverlay && (
            <div className="form-group" style={{ marginTop: 16, background: 'var(--bg-secondary)', padding: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <label className="form-label" style={{ marginBottom: 12 }}>✨ CSS Filters</label>
              <div className="form-row" style={{ gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Opacity ({form.opacity ?? 100}%)</div>
                  <input type="range" min="0" max="100" value={form.opacity ?? 100} onChange={(e) => update({ opacity: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Blur ({form.blur || 0}px)</div>
                  <input type="range" min="0" max="20" value={form.blur || 0} onChange={(e) => update({ blur: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Brightness ({form.brightness ?? 100}%)</div>
                <input type="range" min="0" max="200" value={form.brightness ?? 100} onChange={(e) => update({ brightness: Number(e.target.value) })} style={{ width: '100%' }} />
              </div>
            </div>
          )}

          {/* SFX (ReactS only) */}
          {!isOverlay && (
            <div className="form-group sfx-section" style={{ marginTop: 16 }}>
              <label className="form-label">Sound Effect (SFX)</label>
              {form.sfxUrl ? (
                <div className="sfx-preview">
                  <div className="sfx-info">
                    <span className="sfx-name">{form.sfxFileName}</span>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => update({ sfxUrl: '', sfxFileName: '' })}>Remove</button>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11, marginLeft: 4 }} onClick={() => { const a = new Audio(form.sfxUrl); a.volume = form.sfxVolume / 100; a.play(); }}>Test</button>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <label className="form-label" style={{ marginBottom: 4 }}>SFX Volume</label>
                    <div className="slider-container">
                      <input type="range" min="0" max="100" step="1" value={form.sfxVolume} onChange={(e) => update({ sfxVolume: parseInt(e.target.value) })} />
                      <span className="slider-value">{form.sfxVolume}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <input type="file" accept="audio/*" onChange={handleSfxChange} className="form-input" style={{ padding: '8px' }} />
              )}
            </div>
          )}

          {/* Animations (ReactS only) */}
          {!isOverlay && (
            <>
              <div className="form-row" style={{ marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label">Appear Animation</label>
                  <select className="form-select" value={form.animationIn} onChange={(e) => update({ animationIn: e.target.value })}>
                    {ANIMATION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Disappear Animation</label>
                  <select className="form-select" value={form.animationOut} onChange={(e) => update({ animationOut: e.target.value })}>
                    {ANIMATION_OUT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Appear Speed</label>
                  <div className="slider-container">
                    <input type="range" min="0.1" max="3" step="0.1" value={form.animationInSpeed} onChange={(e) => update({ animationInSpeed: parseFloat(e.target.value) })} />
                    <span className="slider-value">{form.animationInSpeed}s</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Disappear Speed</label>
                  <div className="slider-container">
                    <input type="range" min="0.1" max="3" step="0.1" value={form.animationOutSpeed} onChange={(e) => update({ animationOutSpeed: parseFloat(e.target.value) })} />
                    <span className="slider-value">{form.animationOutSpeed}s</span>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Duration / Auto-Hide (seconds)</label>
                <div className="slider-container">
                  <input type="range" min="1" max="30" step="1" value={form.duration} onChange={(e) => update({ duration: parseInt(e.target.value) })} />
                  <span className="slider-value">{form.duration}s</span>
                </div>
              </div>
              {form.mediaType === 'video' && (
                <div className="form-group">
                  <label className="form-label">Media Volume</label>
                  <div className="slider-container">
                    <input type="range" min="0" max="100" step="1" value={form.volume} onChange={(e) => update({ volume: parseInt(e.target.value) })} />
                    <span className="slider-value">{form.volume}%</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Drag Resize/Crop Editor */}
          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">📍 Position, Size & Crop</label>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
              Drag the box to move. Drag <span style={{ color: 'var(--accent-cyan)' }}>cyan handles</span> to resize. Drag <span style={{ color: '#ff6600' }}>orange handles</span> to crop.
            </div>
            <DragResizeEditor
              config={form}
              onChange={update}
              preset={canvasPreset}
              showCrop={true}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.mediaUrl}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}
