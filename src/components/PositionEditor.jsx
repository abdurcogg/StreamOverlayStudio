import { useState, useRef, useEffect } from 'react';

const CANVAS_W = 1920;
const CANVAS_H = 1080;

export default function PositionEditor({ config, onChange }) {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const pos = config.position || { x: 760, y: 340 };
  const scale = (config.scale || 100) / 100;
  // Use natural media dimensions for the draggable box
  const nw = config.naturalWidth || config.maxWidth || 400;
  const nh = config.naturalHeight || config.maxHeight || 400;
  const boxW = nw * scale;
  const boxH = nh * scale;

  const getCanvasScale = () => {
    if (!canvasRef.current) return 1;
    return canvasRef.current.clientWidth / CANVAS_W;
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const canvasScale = getCanvasScale();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / canvasScale;
    const mouseY = (e.clientY - rect.top) / canvasScale;
    setDragOffset({ x: mouseX - pos.x, y: mouseY - pos.y });
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e) => {
      const canvasScale = getCanvasScale();
      const rect = canvasRef.current.getBoundingClientRect();
      let newX = (e.clientX - rect.left) / canvasScale - dragOffset.x;
      let newY = (e.clientY - rect.top) / canvasScale - dragOffset.y;

      newX = Math.max(0, Math.min(CANVAS_W - boxW, newX));
      newY = Math.max(0, Math.min(CANVAS_H - boxH, newY));

      onChange({ position: { x: Math.round(newX), y: Math.round(newY) } });
    };

    const handleMouseUp = () => {
      setDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, dragOffset, boxW, boxH, onChange]);

  const handleCanvasClick = (e) => {
    if (dragging) return;
    if (e.target !== canvasRef.current && !e.target.classList.contains('position-grid') && !e.target.classList.contains('position-grid-center-h') && !e.target.classList.contains('position-grid-center-v')) return;

    const canvasScale = getCanvasScale();
    const rect = canvasRef.current.getBoundingClientRect();
    let newX = (e.clientX - rect.left) / canvasScale - boxW / 2;
    let newY = (e.clientY - rect.top) / canvasScale - boxH / 2;
    newX = Math.max(0, Math.min(CANVAS_W - boxW, newX));
    newY = Math.max(0, Math.min(CANVAS_H - boxH, newY));
    onChange({ position: { x: Math.round(newX), y: Math.round(newY) } });
  };

  const scalePresets = [50, 75, 100, 150, 200];

  // Calculate percentages for CSS positioning
  const leftPct = (pos.x / CANVAS_W) * 100;
  const topPct = (pos.y / CANVAS_H) * 100;
  const widthPct = (boxW / CANVAS_W) * 100;
  const heightPct = (boxH / CANVAS_H) * 100;

  return (
    <div className="position-editor-container">
      <div className="form-label">📍 Position (1920×1080)</div>

      <div className="scale-presets">
        {scalePresets.map(s => (
          <button
            key={s}
            type="button"
            className={`scale-preset-btn ${config.scale === s ? 'active' : ''}`}
            onClick={() => onChange({ scale: s })}
          >
            {s}%
          </button>
        ))}
        <div className="custom-scale-input">
          <input
            type="number"
            className="form-input"
            style={{ width: 70, padding: '5px 8px', fontSize: 12 }}
            value={config.scale || 100}
            min={10}
            max={300}
            onChange={(e) => onChange({ scale: parseInt(e.target.value) || 100 })}
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>%</span>
        </div>
      </div>

      <div
        className="position-canvas-wrapper"
        ref={canvasRef}
        onClick={handleCanvasClick}
      >
        <div className="position-grid" />
        <div className="position-grid-center-h" />
        <div className="position-grid-center-v" />
        <div
          className="position-draggable"
          style={{
            left: `${leftPct}%`,
            top: `${topPct}%`,
            width: `${widthPct}%`,
            height: `${heightPct}%`,
          }}
          onMouseDown={handleMouseDown}
        >
          {config.mediaUrl && (
            config.mediaType === 'video'
              ? <video src={config.mediaUrl} muted style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
              : <img src={config.mediaUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
          )}
        </div>
      </div>

      <div className="position-coords">
        X: <span>{pos.x}</span> &nbsp; Y: <span>{pos.y}</span>
        &nbsp;&nbsp; Size: <span>{Math.round(boxW)}×{Math.round(boxH)}</span>px
      </div>
    </div>
  );
}
