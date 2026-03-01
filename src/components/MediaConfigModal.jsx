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
    visible: true,
    ...config,
  });

  const update = (changes) => setForm(prev => ({ ...prev, ...changes }));

  const detectMediaSize = (url, mediaType) => {
    if (mediaType === 'video') {
      const video = document.createElement('video');
      video.src = url;
      video.onloadedmetadata = () => {
        const d = (video.duration && isFinite(video.duration)) ? Math.min(Math.ceil(video.duration), 30) : 5;
        update({ naturalWidth: video.videoWidth, naturalHeight: video.videoHeight, duration: d });
      };
    } else {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        update({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
      };
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      let mediaType = 'image';
      if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.name.endsWith('.gif')) mediaType = 'gif';
      
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
          <h2>{config?.id ? 'Edit' : 'Add'} React Media</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '8px' }}>
          {/* --- SCALE SECTION --- */}
          <div className="form-group" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>SCALE %</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>CUSTOM PX</span>
                <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 10 }} onClick={() => update({ maxWidth: form.naturalWidth, maxHeight: form.naturalHeight, scale: 100 })}>↺ reset</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {/* Presets */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
                {[50, 75, 100, 150, 200].map(s => (
                  <button
                    key={s}
                    className={`btn ${form.scale === s ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '6px 12px', fontSize: 12, minWidth: 50 }}
                    onClick={() => update({ scale: s })}
                  >
                    {s}%
                  </button>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: 4, padding: '0 8px', border: '1px solid var(--border-color)', marginLeft: 4 }}>
                  <input 
                    type="number" 
                    value={form.scale} 
                    onChange={e => update({ scale: parseInt(e.target.value) || 0 })}
                    style={{ background: 'transparent', border: 'none', color: '#fff', width: 40, textAlign: 'right', fontSize: 12, outline: 'none' }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 2 }}>%</span>
                </div>
              </div>

              <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>or</div>

              {/* Custom PX */}
              <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-muted)' }}>W</span>
                  <input 
                    type="number" 
                    className="form-input" 
                    style={{ paddingLeft: 24, fontSize: 12 }} 
                    value={Math.round((form.naturalWidth * form.scale) / 100)} 
                    onChange={e => {
                      const newW = parseInt(e.target.value) || 0;
                      update({ scale: Math.round((newW / (form.naturalWidth || 1)) * 100) });
                    }}
                  />
                </div>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-muted)' }}>H</span>
                  <input 
                    type="number" 
                    className="form-input" 
                    style={{ paddingLeft: 24, fontSize: 12 }} 
                    value={Math.round((form.naturalHeight * form.scale) / 100)} 
                    onChange={e => {
                      const newH = parseInt(e.target.value) || 0;
                      update({ scale: Math.round((newH / (form.naturalHeight || 1)) * 100) });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* --- POSITION SECTION --- */}
          <div className="form-group" style={{ marginBottom: 20 }}>
            <PositionEditor 
              config={form} 
              onChange={update} 
            />
            {/* Manual X/Y Inputs */}
            <div style={{ display: 'flex', gap: 12, marginTop: 12, padding: '10px', background: 'var(--bg-secondary)', borderRadius: 4, border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>POS X</span>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ fontSize: 12, padding: '4px 8px' }} 
                  value={Math.round(form.position?.x || 0)} 
                  onChange={e => update({ position: { ...form.position, x: parseInt(e.target.value) || 0 } })}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>POS Y</span>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ fontSize: 12, padding: '4px 8px' }} 
                  value={Math.round(form.position?.y || 0)} 
                  onChange={e => update({ position: { ...form.position, y: parseInt(e.target.value) || 0 } })}
                />
              </div>
              <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => update({ position: { x: 760, y: 340 } })}>center</button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', margin: '20px 0' }} />

          {/* File Info / Change */}
          <div className="form-group">
            <label className="form-label">MEDIA SOURCE</label>
            {form.mediaUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.title || form.fileName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{form.fileName} &bull; {form.naturalWidth}×{form.naturalHeight}px</div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => update({ mediaUrl: '', fileName: '', mediaType: 'image' })}>Change File</button>
              </div>
            ) : (
              <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="form-input" style={{ padding: '8px' }} />
            )}
          </div>

          {/* Visibility & Title */}
          <div className="form-row" style={{ marginTop: 16 }}>
             <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <input type="checkbox" checked={form.visible !== false} onChange={(e) => update({ visible: e.target.checked })} style={{ width: 18, height: 18, cursor: 'pointer' }} id="vis" />
                <label className="form-label" style={{ marginBottom: 0 }} htmlFor="vis">Show in widget</label>
             </div>
             <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Display Name (Dashboard)</label>
                <input type="text" className="form-input" value={form.title} onChange={(e) => update({ title: e.target.value })} placeholder="e.g. Meme React" />
             </div>
          </div>

          {/* SFX */}
          <div className="form-group sfx-section" style={{ marginTop: 16, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
            <label className="form-label">Sound Effect (SFX)</label>
            {form.sfxUrl ? (
              <div className="sfx-preview">
                <div className="sfx-info" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="sfx-name" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.sfxFileName}</span>
                  <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => update({ sfxUrl: '', sfxFileName: '' })}>Remove</button>
                  <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => { const a = new Audio(form.sfxUrl); a.volume = (form.sfxVolume||80) / 100; a.play(); }}>Test</button>
                </div>
                <div style={{ marginTop: 8 }}>
                  <label className="form-label" style={{ marginBottom: 4, fontSize: 11 }}>SFX Volume ({form.sfxVolume || 80}%)</label>
                  <input type="range" min="0" max="100" value={form.sfxVolume || 80} onChange={(e) => update({ sfxVolume: parseInt(e.target.value) })} style={{ width: '100%' }} />
                </div>
              </div>
            ) : (
              <input type="file" accept="audio/*" onChange={handleSfxChange} className="form-input" style={{ padding: '8px' }} />
            )}
          </div>

          {/* Animations */}
          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 16, paddingTop: 16 }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">In Animation</label>
                <select className="form-select" value={form.animationIn} onChange={(e) => update({ animationIn: e.target.value })}>
                  {ANIMATION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Out Animation</label>
                <select className="form-select" value={form.animationOut} onChange={(e) => update({ animationOut: e.target.value })}>
                  {ANIMATION_OUT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row" style={{ marginTop: 8 }}>
              <div className="form-group">
                <label className="form-label">In Speed ({form.animationInSpeed}s)</label>
                <input type="range" min="0.1" max="3" step="0.1" value={form.animationInSpeed} onChange={(e) => update({ animationInSpeed: parseFloat(e.target.value) })} style={{ width: '100%' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Out Speed ({form.animationOutSpeed}s)</label>
                <input type="range" min="0.1" max="3" step="0.1" value={form.animationOutSpeed} onChange={(e) => update({ animationOutSpeed: parseFloat(e.target.value) })} style={{ width: '100%' }} />
              </div>
            </div>
            <div className="form-row" style={{ marginTop: 8 }}>
              <div className="form-group">
                <label className="form-label">Display Time ({form.duration}s)</label>
                <input type="range" min="1" max="60" value={form.duration} onChange={(e) => update({ duration: parseInt(e.target.value) })} style={{ width: '100%' }} />
              </div>
              {form.mediaType === 'video' && (
                <div className="form-group">
                  <label className="form-label">Video Volume ({form.volume}%)</label>
                  <input type="range" min="0" max="100" value={form.volume} onChange={(e) => update({ volume: parseInt(e.target.value) })} style={{ width: '100%' }} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.mediaUrl}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
