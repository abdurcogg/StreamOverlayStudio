import { useState, useRef, useCallback, useEffect } from 'react';

const HANDLE_SIZE = 10;

const CANVAS_PRESETS = {
  youtube: { w: 1920, h: 1080, label: 'YouTube (16:9)' },
  tiktok:  { w: 1080, h: 1920, label: 'TikTok (9:16)' },
  square:  { w: 1080, h: 1080, label: 'Square (1:1)' },
  custom:  { w: 1920, h: 1080, label: 'Custom' },
};

// pos/size are all in canvas coordinates (e.g. 1920x1080 space)
export default function DragResizeEditor({ config, onChange, preset = 'youtube', showCrop = true }) {
  const containerRef = useRef(null);
  const [containerRect, setContainerRect] = useState(null);
  const [dragState, setDragState] = useState(null); // { type: 'move'|'resize'|'crop', handle: string, startX, startY, origX, origY, origW, origH, origCrop }

  const canvas = CANVAS_PRESETS[preset] || CANVAS_PRESETS.youtube;

  // Compute display scale factor so canvas fits in container
  const getScale = useCallback(() => {
    if (!containerRect) return 1;
    const scaleX = containerRect.width / canvas.w;
    const scaleY = containerRect.height / canvas.h;
    return Math.min(scaleX, scaleY);
  }, [containerRect, canvas]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerRect(entry.contentRect);
      }
    });
    ro.observe(containerRef.current);
    setContainerRect(containerRef.current.getBoundingClientRect());
    return () => ro.disconnect();
  }, []);

  const scale = getScale();

  // Item rect in canvas coords
  const pos = config.position || { x: 100, y: 100 };
  const naturalW = config.naturalWidth || 400;
  const naturalH = config.naturalHeight || 400;
  const itemScale = (config.scale || 100) / 100;
  const itemW = Math.max(20, naturalW * itemScale);
  const itemH = Math.max(20, naturalH * itemScale);
  const crop = config.crop || { top: 0, bottom: 0, left: 0, right: 0 };

  // Displayed item rect in screen px
  const dispX = pos.x * scale;
  const dispY = pos.y * scale;
  const dispW = itemW * scale;
  const dispH = itemH * scale;

  // Crop overlay in screen px (inset from item edges)
  const cropTop    = (crop.top    / 100) * dispH;
  const cropBottom = (crop.bottom / 100) * dispH;
  const cropLeft   = (crop.left   / 100) * dispW;
  const cropRight  = (crop.right  / 100) * dispW;

  const startDrag = useCallback((e, type, handle) => {
    e.stopPropagation();
    e.preventDefault();
    const startPos = { x: e.clientX, y: e.clientY };
    setDragState({
      type, handle,
      startX: startPos.x, startY: startPos.y,
      origX: pos.x, origY: pos.y,
      origW: itemW, origH: itemH,
      origCrop: { ...crop },
    });
  }, [pos, itemW, itemH, crop]);

  const onMouseMove = useCallback((e) => {
    if (!dragState || !scale) return;
    const dx = (e.clientX - dragState.startX) / scale;
    const dy = (e.clientY - dragState.startY) / scale;

    if (dragState.type === 'move') {
      onChange({
        position: {
          x: Math.max(0, Math.round(dragState.origX + dx)),
          y: Math.max(0, Math.round(dragState.origY + dy)),
        }
      });
    } else if (dragState.type === 'resize') {
      let newW = dragState.origW;
      let newH = dragState.origH;
      let newX = dragState.origX;
      let newY = dragState.origY;
      const h = dragState.handle;
      
      // Handle-based resize
      if (h.includes('e')) newW = Math.max(20, dragState.origW + dx);
      if (h.includes('s')) newH = Math.max(20, dragState.origH + dy);
      if (h.includes('w')) { newW = Math.max(20, dragState.origW - dx); newX = dragState.origX + dx; }
      if (h.includes('n')) { newH = Math.max(20, dragState.origH - dy); newY = dragState.origY + dy; }
      
      const newScale = Math.round((newW / (config.naturalWidth || 400)) * 100);
      onChange({
        scale: Math.max(5, newScale),
        position: { x: Math.round(newX), y: Math.round(newY) },
      });
    } else if (dragState.type === 'crop') {
      const h = dragState.handle;
      const newCrop = { ...dragState.origCrop };
      const maxCrop = 49;
      
      if (h === 'top')    newCrop.top    = Math.max(0, Math.min(maxCrop, dragState.origCrop.top    + (dy / dragState.origH * 100)));
      if (h === 'bottom') newCrop.bottom = Math.max(0, Math.min(maxCrop, dragState.origCrop.bottom - (dy / dragState.origH * 100)));
      if (h === 'left')   newCrop.left   = Math.max(0, Math.min(maxCrop, dragState.origCrop.left   + (dx / dragState.origW * 100)));
      if (h === 'right')  newCrop.right  = Math.max(0, Math.min(maxCrop, dragState.origCrop.right  - (dx / dragState.origW * 100)));
      
      onChange({ crop: { top: Math.round(newCrop.top), bottom: Math.round(newCrop.bottom), left: Math.round(newCrop.left), right: Math.round(newCrop.right) } });
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
    { id: 'top',    style: { top: cropTop - hs/2, left: dispW/2 - hs/2, cursor: 'n-resize' } },
    { id: 'bottom', style: { top: dispH - cropBottom - hs/2, left: dispW/2 - hs/2, cursor: 's-resize' } },
    { id: 'left',   style: { top: dispH/2 - hs/2, left: cropLeft - hs/2, cursor: 'e-resize' } },
    { id: 'right',  style: { top: dispH/2 - hs/2, left: dispW - cropRight - hs/2, cursor: 'w-resize' } },
  ] : [];

  // Canvas display dimensions
  const canvasDisplayW = containerRect ? containerRect.width : 400;
  const canvasDisplayH = containerRect ? Math.round(canvas.h * (canvasDisplayW / canvas.w)) : 0;

  return (
    <div>
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: canvasDisplayH || 200,
          background: 'repeating-linear-gradient(45deg, #111, #111 10px, #0a0a0a 10px, #0a0a0a 20px)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          userSelect: 'none',
        }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        {/* Grid lines */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.04) 1px, transparent 1px)', backgroundSize: `${canvasDisplayW/12}px ${canvasDisplayH/8}px` }} />

        {/* The item box */}
        {scale > 0 && (
          <div
            style={{
              position: 'absolute',
              left: dispX,
              top: dispY,
              width: dispW,
              height: dispH,
              border: '2px solid var(--accent-cyan)',
              boxSizing: 'border-box',
              cursor: 'move',
            }}
            onMouseDown={(e) => startDrag(e, 'move', 'move')}
          >
            {/* Media preview inside box */}
            {config.mediaUrl && (
              <div style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                opacity: 0.6,
              }}>
                {config.mediaType === 'video'
                  ? <video src={config.mediaUrl} muted style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
                  : <img src={config.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
                }
              </div>
            )}
            {config.text && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: config.textColor || '#fff', fontSize: Math.max(8, 16 * scale), fontFamily: config.fontFamily || 'inherit', overflow: 'hidden' }}>
                {config.text}
              </div>
            )}

            {/* Crop overlay (dashed inner border) */}
            {showCrop && (
              <div style={{
                position: 'absolute',
                left: cropLeft,
                top: cropTop,
                right: cropRight,
                bottom: cropBottom,
                border: '1.5px dashed #ff6600',
                pointerEvents: 'none',
                boxSizing: 'border-box',
              }} />
            )}

            {/* Resize handles */}
            {resizeHandles.map(h => (
              <div
                key={h.id}
                onMouseDown={(e) => startDrag(e, 'resize', h.id)}
                style={{
                  position: 'absolute',
                  width: hs, height: hs,
                  background: 'var(--accent-cyan)',
                  border: '1px solid #000',
                  borderRadius: 2,
                  ...h.style,
                }}
              />
            ))}

            {/* Crop handles */}
            {cropHandles.map(h => (
              <div
                key={h.id}
                onMouseDown={(e) => startDrag(e, 'crop', h.id)}
                style={{
                  position: 'absolute',
                  width: hs, height: hs,
                  background: '#ff6600',
                  border: '1px solid #000',
                  borderRadius: 2,
                  ...h.style,
                }}
              />
            ))}
          </div>
        )}

        {/* Canvas size label */}
        <div style={{ position: 'absolute', bottom: 4, right: 6, fontSize: 9, color: 'rgba(0,255,255,0.4)', pointerEvents: 'none' }}>
          {canvas.w}×{canvas.h}
        </div>
      </div>

      {/* Position / Size info */}
      <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
        <span>X: <strong>{Math.round(pos.x)}</strong></span>
        <span>Y: <strong>{Math.round(pos.y)}</strong></span>
        <span>Scale: <strong>{config.scale || 100}%</strong></span>
        {showCrop && <span style={{ color: '#ff6600' }}>Crop T:{crop.top}% B:{crop.bottom}% L:{crop.left}% R:{crop.right}%</span>}
      </div>
    </div>
  );
}
