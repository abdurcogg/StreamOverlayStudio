import { useState, useRef, useCallback, useEffect } from 'react';

const HANDLE_SIZE = 10;
const STEP = 10; // nudge step in canvas px

const CANVAS_PRESETS = {
  youtube: { w: 1920, h: 1080 },
  tiktok:  { w: 1080, h: 1920 },
  square:  { w: 1080, h: 1080 },
  custom:  { w: 1920, h: 1080 },
};

// Arrow button for nudging
function NudgeBtn({ label, onClick }) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        color: 'var(--text-primary)', cursor: 'pointer', borderRadius: 4,
        width: '100%', height: 32, fontSize: 14, userSelect: 'none',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-cyan-dim)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
    >
      {label}
    </button>
  );
}

export default function DragResizeEditor({ config, onChange, preset = 'youtube', showCrop = true }) {
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ w: 400, h: 225 });
  const [dragState, setDragState] = useState(null);

  const canvas = CANVAS_PRESETS[preset] || CANVAS_PRESETS.youtube;

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const rect = entries[0].contentRect;
      setContainerSize({ w: rect.width, h: rect.height });
    });
    ro.observe(containerRef.current);
    const rect = containerRef.current.getBoundingClientRect();
    setContainerSize({ w: rect.width, h: rect.height });
    return () => ro.disconnect();
  }, []);

  // Scale: canvas coords → screen px
  const scale = Math.min(containerSize.w / canvas.w, containerSize.h / canvas.h);
  const canvasDisplayW = canvas.w * scale;
  const canvasDisplayH = canvas.h * scale;

  const pos = config.position || { x: 0, y: 0 };
  const naturalW = config.naturalWidth || 400;
  const naturalH = config.naturalHeight || 400;
  const itemScale = (config.scale || 100) / 100;
  const itemW = Math.max(20, naturalW * itemScale);
  const itemH = Math.max(20, naturalH * itemScale);
  const crop = config.crop || { top: 0, bottom: 0, left: 0, right: 0 };

  const dispX = pos.x * scale;
  const dispY = pos.y * scale;
  const dispW = itemW * scale;
  const dispH = itemH * scale;

  const cropTop    = (crop.top    / 100) * dispH;
  const cropBottom = (crop.bottom / 100) * dispH;
  const cropLeft   = (crop.left   / 100) * dispW;
  const cropRight  = (crop.right  / 100) * dispW;

  // Nudge helpers
  const nudge = (dx, dy) => {
    onChange({ position: { x: Math.max(0, pos.x + dx), y: Math.max(0, pos.y + dy) } });
  };

  const startDrag = useCallback((e, type, handle) => {
    e.stopPropagation();
    e.preventDefault();
    setDragState({ type, handle, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y, origW: itemW, origH: itemH, origCrop: { ...crop } });
  }, [pos, itemW, itemH, crop]);

  const onMouseMove = useCallback((e) => {
    if (!dragState || !scale) return;
    const dx = (e.clientX - dragState.startX) / scale;
    const dy = (e.clientY - dragState.startY) / scale;

    if (dragState.type === 'move') {
      onChange({ position: { x: Math.max(0, Math.round(dragState.origX + dx)), y: Math.max(0, Math.round(dragState.origY + dy)) } });
    } else if (dragState.type === 'resize') {
      let newW = dragState.origW, newH = dragState.origH;
      let newX = dragState.origX, newY = dragState.origY;
      const h = dragState.handle;
      if (h.includes('e')) newW = Math.max(20, dragState.origW + dx);
      if (h.includes('s')) newH = Math.max(20, dragState.origH + dy);
      if (h.includes('w')) { newW = Math.max(20, dragState.origW - dx); newX = dragState.origX + dx; }
      if (h.includes('n')) { newH = Math.max(20, dragState.origH - dy); newY = dragState.origY + dy; }
      onChange({ scale: Math.max(5, Math.round((newW / (config.naturalWidth || 400)) * 100)), position: { x: Math.round(newX), y: Math.round(newY) } });
    } else if (dragState.type === 'crop') {
      const h = dragState.handle;
      const c = { ...dragState.origCrop };
      const maxC = 49;
      if (h === 'top')    c.top    = Math.max(0, Math.min(maxC, dragState.origCrop.top    + (dy / dragState.origH * 100)));
      if (h === 'bottom') c.bottom = Math.max(0, Math.min(maxC, dragState.origCrop.bottom - (dy / dragState.origH * 100)));
      if (h === 'left')   c.left   = Math.max(0, Math.min(maxC, dragState.origCrop.left   + (dx / dragState.origW * 100)));
      if (h === 'right')  c.right  = Math.max(0, Math.min(maxC, dragState.origCrop.right  - (dx / dragState.origW * 100)));
      onChange({ crop: { top: Math.round(c.top), bottom: Math.round(c.bottom), left: Math.round(c.left), right: Math.round(c.right) } });
    }
  }, [dragState, scale, onChange, config.naturalWidth]);

  const onMouseUp = useCallback(() => setDragState(null), []);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState, onMouseMove, onMouseUp]);

  const hs = HANDLE_SIZE;
  const resizeHandles = [
    { id: 'nw', style: { top: -hs/2, left: -hs/2, cursor: 'nw-resize' } },
    { id: 'n',  style: { top: -hs/2, left: dispW/2 - hs/2, cursor: 'n-resize' } },
    { id: 'ne', style: { top: -hs/2, right: -hs/2, cursor: 'ne-resize' } },
    { id: 'w',  style: { top: dispH/2 - hs/2, left: -hs/2, cursor: 'w-resize' } },
    { id: 'e',  style: { top: dispH/2 - hs/2, right: -hs/2, cursor: 'e-resize' } },
    { id: 'sw', style: { bottom: -hs/2, left: -hs/2, cursor: 'sw-resize' } },
    { id: 's',  style: { bottom: -hs/2, left: dispW/2 - hs/2, cursor: 's-resize' } },
    { id: 'se', style: { bottom: -hs/2, right: -hs/2, cursor: 'se-resize' } },
  ];

  const cropHandles = showCrop ? [
    { id: 'top',    style: { top: cropTop - hs/2,         left: dispW/2 - hs/2,       cursor: 'n-resize' } },
    { id: 'bottom', style: { top: dispH - cropBottom - hs/2, left: dispW/2 - hs/2,    cursor: 's-resize' } },
    { id: 'left',   style: { top: dispH/2 - hs/2,         left: cropLeft - hs/2,      cursor: 'e-resize' } },
    { id: 'right',  style: { top: dispH/2 - hs/2,         left: dispW - cropRight - hs/2, cursor: 'w-resize' } },
  ] : [];

  const BtnStyle = { gridColumn: 'span 1' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, userSelect: 'none' }}>
      {/* --- POSITION label --- */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
        Position ({canvas.w}x{canvas.h})
      </div>

      {/* --- Arrow Grid + Canvas --- */}
      <div style={{ display: 'flex', gap: 8 }}>
        {/* Arrow grid (OBS-style 3x3) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 36px)', gridTemplateRows: 'repeat(3, 32px)', gap: 4, flexShrink: 0 }}>
          <NudgeBtn label="↖" onClick={() => nudge(-STEP, -STEP)} />
          <NudgeBtn label="↑" onClick={() => nudge(0, -STEP)} />
          <NudgeBtn label="↗" onClick={() => nudge(STEP, -STEP)} />
          <NudgeBtn label="←" onClick={() => nudge(-STEP, 0)} />
          <NudgeBtn label="+" onClick={() => onChange({ position: { x: Math.round((canvas.w - itemW) / 2), y: Math.round((canvas.h - itemH) / 2) } })} />
          <NudgeBtn label="→" onClick={() => nudge(STEP, 0)} />
          <NudgeBtn label="↙" onClick={() => nudge(-STEP, STEP)} />
          <NudgeBtn label="↓" onClick={() => nudge(0, STEP)} />
          <NudgeBtn label="↘" onClick={() => nudge(STEP, STEP)} />
        </div>

        {/* Canvas preview */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            position: 'relative',
            height: 180,
            background: '#0d0d0d',
            border: '1px solid var(--border-color)',
            borderRadius: 4,
            overflow: 'hidden',
            cursor: 'crosshair',
          }}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          {/* Grid */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: `${canvasDisplayW/16}px ${canvasDisplayH/9}px` }} />

          {/* Center crosshair */}
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,0,0,0.2)', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,0,0,0.2)', transform: 'translateY(-50%)', pointerEvents: 'none' }} />

          {/* Item box */}
          {scale > 0 && (
            <div
              style={{ position: 'absolute', left: dispX, top: dispY, width: dispW, height: dispH, border: '1.5px solid var(--accent-cyan)', boxSizing: 'border-box', cursor: 'move' }}
              onMouseDown={(e) => startDrag(e, 'move', 'move')}
            >
              {/* Media/text preview */}
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.5 }}>
                {config.mediaUrl && (
                  config.mediaType === 'video'
                    ? <video src={config.mediaUrl} muted style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
                    : <img src={config.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
                )}
                {config.text && (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: config.textColor || '#fff', fontSize: Math.max(6, 14 * scale), fontFamily: config.fontFamily || 'sans-serif', overflow: 'hidden', padding: 2 }}>
                    {config.text}
                  </div>
                )}
              </div>

              {/* Crop inner border */}
              {showCrop && (
                <div style={{ position: 'absolute', left: cropLeft, top: cropTop, right: cropRight, bottom: cropBottom, border: '1px dashed #ff6600', pointerEvents: 'none', boxSizing: 'border-box' }} />
              )}

              {/* Resize handles (red dots - OBS style) */}
              {resizeHandles.map(h => (
                <div key={h.id} onMouseDown={(e) => startDrag(e, 'resize', h.id)} style={{ position: 'absolute', width: hs, height: hs, background: '#ff4444', border: '1px solid #fff', borderRadius: '50%', ...h.style }} />
              ))}

              {/* Crop handles (orange) */}
              {cropHandles.map(h => (
                <div key={h.id} onMouseDown={(e) => startDrag(e, 'crop', h.id)} style={{ position: 'absolute', width: hs, height: hs, background: '#ff8800', border: '1px solid #fff', borderRadius: '50%', ...h.style }} />
              ))}
            </div>
          )}

          {/* Canvas label */}
          <div style={{ position: 'absolute', bottom: 4, right: 6, fontSize: 9, color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }}>
            {canvas.w}x{canvas.h}
          </div>
        </div>
      </div>

      {/* X/Y/Scale readout */}
      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
        <span>X: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(pos.x)}</strong></span>
        <span>Y: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(pos.y)}</strong></span>
        <span>Scale: <strong style={{ color: 'var(--text-primary)' }}>{config.scale || 100}%</strong></span>
        {showCrop && (
          <span style={{ color: '#ff8800' }}>
            Crop  T:{crop.top}%  B:{crop.bottom}%  L:{crop.left}%  R:{crop.right}%
          </span>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-muted)' }}>
        <span><span style={{ color: 'var(--accent-cyan)' }}>—</span> Boundary</span>
        <span><span style={{ color: '#ff4444' }}>•</span> Resize handle</span>
        {showCrop && <span><span style={{ color: '#ff8800' }}>•</span> Crop handle</span>}
      </div>
    </div>
  );
}
