import { useState, useEffect } from 'react';
import DragResizeEditor from './DragResizeEditor';

const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Poppins', 'Oswald', 'Bebas Neue', 'Bangers',
  'Montserrat', 'Playpen Sans', 'Permanent Marker', 'Bungee', 'Press Start 2P',
  'Orbitron', 'Rajdhani', 'Anton', 'Exo 2', 'Russo One',
];

export default function TextLayerModal({ config, onSave, onClose, preset = 'youtube' }) {
  const [form, setForm] = useState({
    type: 'overlays',
    itemType: 'text',
    text: '',
    fontFamily: 'Inter',
    fontSize: 48,
    fontWeight: 'bold',
    textColor: '#ffffff',
    textAlign: 'center',
    textShadow: true,
    strokeColor: '#000000',
    strokeWidth: 2,
    isScrolling: false,
    scrollDirection: 'left',
    scrollSpeed: 5,
    position: { x: 100, y: 100 },
    scale: 100,
    naturalWidth: 800,
    naturalHeight: 100,
    opacity: 100,
    visible: true,
    title: '',
    mediaUrl: '',
    ...config,
  });

  const update = (changes) => setForm(prev => ({ ...prev, ...changes }));

  // Load Google font dynamically when changed
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${form.fontFamily.replace(/ /g, '+')}:wght@400;700&display=swap`;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, [form.fontFamily]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSave = () => {
    if (!form.text.trim()) return alert('Please enter some text!');
    onSave({ ...form, title: form.title || form.text.substring(0, 30) });
  };

  const previewText = form.text || 'Preview Text';

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 640, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h2>{config?.id ? 'Edit Text Layer' : 'Add Text Layer'}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Text Input */}
          <div className="form-group">
            <label className="form-label">Text Content</label>
            <textarea
              className="form-input"
              value={form.text}
              onChange={(e) => update({ text: e.target.value })}
              placeholder="Type your text here..."
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Preview */}
          {form.text && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Live Preview</label>
              <div style={{
                background: 'rgba(0,0,0,0.7)',
                borderRadius: 8,
                padding: '12px 16px',
                overflow: 'hidden',
                minHeight: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: form.textAlign === 'left' ? 'flex-start' : form.textAlign === 'right' ? 'flex-end' : 'center',
              }}>
                <div style={{
                  fontFamily: form.fontFamily,
                  fontSize: Math.max(12, form.fontSize * 0.3),
                  fontWeight: form.fontWeight,
                  color: form.textColor,
                  textShadow: form.textShadow ? `${form.strokeWidth}px ${form.strokeWidth}px 4px ${form.strokeColor}` : 'none',
                  WebkitTextStroke: `${form.strokeWidth}px ${form.strokeColor}`,
                  animation: form.isScrolling ? `marquee-${form.scrollDirection || 'left'} ${16 - (form.scrollSpeed || 5)}s linear infinite` : 'none',
                  whiteSpace: 'nowrap',
                }}>
                  {previewText}
                </div>
              </div>
            </div>
          )}

          {/* Font Settings */}
          <div style={{ marginTop: 16, background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <label className="form-label" style={{ marginBottom: 12 }}>🎨 Font & Style</label>

            <div className="form-row" style={{ gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 2 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Font Family</div>
                <select
                  className="form-select"
                  value={form.fontFamily}
                  onChange={(e) => update({ fontFamily: e.target.value })}
                  style={{ fontFamily: form.fontFamily }}
                >
                  {GOOGLE_FONTS.map(f => (
                    <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Size ({form.fontSize}px)</div>
                <input type="range" min="10" max="200" value={form.fontSize} onChange={(e) => update({ fontSize: Number(e.target.value) })} style={{ width: '100%' }} />
              </div>
            </div>

            <div className="form-row" style={{ gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Text Color</div>
                <input type="color" value={form.textColor} onChange={(e) => update({ textColor: e.target.value })} style={{ width: '100%', height: 36, cursor: 'pointer', background: 'none', border: '1px solid var(--border-color)', borderRadius: 4 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Stroke Color</div>
                <input type="color" value={form.strokeColor} onChange={(e) => update({ strokeColor: e.target.value })} style={{ width: '100%', height: 36, cursor: 'pointer', background: 'none', border: '1px solid var(--border-color)', borderRadius: 4 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Stroke ({form.strokeWidth}px)</div>
                <input type="range" min="0" max="10" value={form.strokeWidth} onChange={(e) => update({ strokeWidth: Number(e.target.value) })} style={{ width: '100%' }} />
              </div>
            </div>

            <div className="form-row" style={{ gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Alignment</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['left', 'center', 'right'].map(align => (
                    <button
                      key={align}
                      className={`btn ${form.textAlign === align ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ flex: 1, padding: '4px', fontSize: 11 }}
                      onClick={() => update({ textAlign: align })}
                    >
                      {align === 'left' ? '≡' : align === 'center' ? '≡' : '≡'}{align[0].toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Weight</div>
                <select className="form-select" value={form.fontWeight} onChange={(e) => update({ fontWeight: e.target.value })}>
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                  <option value="900">Black</option>
                  <option value="300">Light</option>
                </select>
              </div>
            </div>
          </div>

          {/* Scroll Animation */}
          <div style={{ marginTop: 16, background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <label className="form-label" style={{ marginBottom: 12 }}>🎬 Animation</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <input
                type="checkbox"
                id="scrollingToggle"
                checked={form.isScrolling}
                onChange={(e) => update({ isScrolling: e.target.checked })}
                style={{ width: 16, height: 16 }}
              />
              <label htmlFor="scrollingToggle" style={{ cursor: 'pointer', fontSize: 13 }}>Scrolling / Marquee</label>
            </div>
            {form.isScrolling && (
              <div className="form-row" style={{ gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Direction</div>
                  <select className="form-select" value={form.scrollDirection} onChange={(e) => update({ scrollDirection: e.target.value })}>
                    <option value="left">← Right to Left</option>
                    <option value="right">→ Left to Right</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Speed ({form.scrollSpeed})</div>
                  <input type="range" min="1" max="15" value={form.scrollSpeed} onChange={(e) => update({ scrollSpeed: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
              </div>
            )}
          </div>

          {/* Visibility */}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              checked={form.visible !== false}
              onChange={(e) => update({ visible: e.target.checked })}
              style={{ width: 16, height: 16 }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Visible in widget</span>
          </div>

          {/* Position on Canvas */}
          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">📍 Position on Canvas</label>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
              Drag the box to reposition. Drag edges to resize.
            </div>
            <DragResizeEditor
              config={form}
              onChange={update}
              preset={preset}
              showCrop={false}
            />
          </div>

          {/* Title for Dashboard */}
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Label (for Dashboard)</label>
            <input
              type="text"
              className="form-input"
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder={form.text.substring(0, 30) || 'My Text Overlay'}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.text.trim()}>
            Save Text Layer
          </button>
        </div>
      </div>
    </div>
  );
}
