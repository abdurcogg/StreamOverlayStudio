import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { isAdmin, getMaintenanceStatus, setMaintenanceStatus } from '../lib/admin';
import { loadMediaConfigs, addMediaConfig, updateMediaConfig, deleteMediaConfig } from '../lib/store';
import MediaConfigModal from '../components/MediaConfigModal';
import TextLayerModal from '../components/TextLayerModal';

const PRESETS = [
  { id: 'youtube', label: 'YouTube (16:9)', w: 1920, h: 1080 },
  { id: 'tiktok',  label: 'TikTok (9:16)',  w: 1080, h: 1920 },
  { id: 'square',  label: 'Square (1:1)',    w: 1080, h: 1080 },
];

// Eye icon SVG
const EyeIcon = ({ visible }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill={visible ? 'var(--accent-cyan)' : '#555'} style={{ flexShrink: 0 }}>
    {visible ? (
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
    ) : (
      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
    )}
  </svg>
);

export default function OverlaySDashboard() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [canvasPreset, setCanvasPreset] = useState('youtube');
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [maintenance, setMaintenance] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef(null);
  const canvasRef = useRef(null);
  const [canvasRect, setCanvasRect] = useState({ w: 600, h: 338 });
  const [dragState, setDragState] = useState(null);

  const preset = PRESETS.find(p => p.id === canvasPreset) || PRESETS[0];
  const primaryId = [...selectedIds][selectedIds.size - 1] || null;
  const selected = configs.find(c => c.id === primaryId);

  const selectSource = (id, shiftKey) => {
    setSelectedIds(prev => {
      if (shiftKey) {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      }
      return new Set([id]);
    });
  };

  const clearSelection = () => setSelectedIds(new Set());
  const admin = session && isAdmin(session.user.email);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) fetchAll();
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s);
      if (s) fetchAll();
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    getMaintenanceStatus().then(setMaintenance);
  }, []);

  // Load Google Fonts for text overlays on the canvas
  useEffect(() => {
    const textConfigs = configs.filter(c => c.itemType === 'text' && c.fontFamily);
    const families = [...new Set(textConfigs.map(c => c.fontFamily))];
    if (families.length === 0) return;
    const linkId = 'overlays-google-fonts';
    let link = document.getElementById(linkId);
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?${families.map(f => `family=${f.replace(/ /g, '+')}:wght@300;400;700;900`).join('&')}&display=swap`;
  }, [configs]);

  // Close add menu on outside click
  useEffect(() => {
    const handler = (e) => { if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setShowAddMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Canvas resize observer
  useEffect(() => {
    if (!canvasRef.current) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      setCanvasRect({ w: r.width, h: r.height });
    });
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [session]);

  const fetchAll = async () => {
    const data = await loadMediaConfigs('overlays');
    setConfigs(data);
  };

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/overlays' } });
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setConfigs([]); };

  // Canvas display height: cap at 400px
  const maxCanvasH = 400;
  const canvasAspect = preset.h / preset.w;
  const canvasDisplayH = Math.min(canvasRect.w * canvasAspect, maxCanvasH);

  // Scale factor: canvas coords -> screen px
  const scale = Math.min(canvasRect.w / preset.w, canvasDisplayH / preset.h);

  // --- DRAG ---
  const startDrag = useCallback((e, id, type, handle) => {
    e.stopPropagation();
    e.preventDefault();
    const cfg = configs.find(c => c.id === id);
    if (!cfg) return;
    selectSource(id, false);
    const nw = cfg.naturalWidth || 400;
    const nh = cfg.naturalHeight || 400;
    const s = (cfg.scale || 100) / 100;
    setDragState({
      type, handle, id,
      startX: e.clientX, startY: e.clientY,
      origX: cfg.position?.x || 0, origY: cfg.position?.y || 0,
      origW: nw * s, origH: nh * s,
      origNW: nw,
    });
  }, [configs]);

  const onMouseMove = useCallback((e) => {
    if (!dragState) return;
    const dx = (e.clientX - dragState.startX) / scale;
    const dy = (e.clientY - dragState.startY) / scale;
    const cfg = configs.find(c => c.id === dragState.id);
    if (!cfg) return;

    if (dragState.type === 'move') {
      const newConfigs = configs.map(c => c.id === dragState.id ? { ...c, position: { x: Math.max(0, Math.round(dragState.origX + dx)), y: Math.max(0, Math.round(dragState.origY + dy)) } } : c);
      setConfigs(newConfigs);
    } else if (dragState.type === 'resize') {
      const h = dragState.handle;
      let nW = dragState.origW, nH = dragState.origH;
      let nX = dragState.origX, nY = dragState.origY;
      if (h.includes('e')) nW = Math.max(20, dragState.origW + dx);
      if (h.includes('s')) nH = Math.max(20, dragState.origH + dy);
      if (h.includes('w')) { nW = Math.max(20, dragState.origW - dx); nX = dragState.origX + dx; }
      if (h.includes('n')) { nH = Math.max(20, dragState.origH - dy); nY = dragState.origY + dy; }
      const newScale = Math.max(5, Math.round((nW / dragState.origNW) * 100));
      const newConfigs = configs.map(c => c.id === dragState.id ? { ...c, scale: newScale, position: { x: Math.round(nX), y: Math.round(nY) } } : c);
      setConfigs(newConfigs);
    }
  }, [dragState, configs, scale]);

  const onMouseUp = useCallback(async () => {
    if (!dragState) return;
    const cfg = configs.find(c => c.id === dragState.id);
    if (cfg) {
      try { await updateMediaConfig(cfg.id, { position: cfg.position, scale: cfg.scale }); } catch {}
    }
    setDragState(null);
  }, [dragState, configs]);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, [dragState, onMouseMove, onMouseUp]);

  // --- SAVE ---
  const handleSave = async (formData) => {
    try {
      if (editingConfig?.id) {
        await updateMediaConfig(editingConfig.id, formData);
        showToast('Updated!');
      } else {
        await addMediaConfig(formData, 'overlays');
        showToast('Added!');
      }
      await fetchAll();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
    setShowMediaModal(false);
    setShowTextModal(false);
    setEditingConfig(null);
  };

  const handleDelete = async (ids) => {
    const idsArr = Array.isArray(ids) ? ids : [ids];
    if (!window.confirm(`Delete ${idsArr.length} source(s)?`)) return;
    try {
      for (const id of idsArr) await deleteMediaConfig(id);
      await fetchAll(); showToast('Deleted', 'error');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    setSelectedIds(new Set());
  };

  const centerSelected = async () => {
    if (!primaryId) return;
    const cfg = configs.find(c => c.id === primaryId);
    if (!cfg) return;
    const nw = cfg.naturalWidth || 400;
    const nh = cfg.naturalHeight || 400;
    const s = (cfg.scale || 100) / 100;
    const cx = Math.round((preset.w - nw * s) / 2);
    const cy = Math.round((preset.h - nh * s) / 2);
    const pos = { x: Math.max(0, cx), y: Math.max(0, cy) };
    const newConfigs = configs.map(c => c.id === primaryId ? { ...c, position: pos } : c);
    setConfigs(newConfigs);
    try { await updateMediaConfig(primaryId, { position: pos }); } catch {}
  };

  const toggleVisibility = async (id) => {
    const cfg = configs.find(c => c.id === id);
    if (!cfg) return;
    const newVis = cfg.visible === false ? true : false;
    const newConfigs = configs.map(c => c.id === id ? { ...c, visible: newVis } : c);
    setConfigs(newConfigs);
    try { await updateMediaConfig(id, { visible: newVis }); } catch {}
  };

  const updateProperty = async (key, value) => {
    if (!primaryId) return;
    const newConfigs = configs.map(c => c.id === primaryId ? { ...c, [key]: value } : c);
    setConfigs(newConfigs);
  };

  const saveProperty = async (updates) => {
    if (!primaryId) return;
    try { await updateMediaConfig(primaryId, updates); } catch {}
  };

  const handleCopy = async () => {
    const widgetUrl = `${window.location.origin}/overlays/widget?uid=${session.user.id}&preset=${canvasPreset}`;
    try { await navigator.clipboard.writeText(widgetUrl); } catch { const i = document.createElement('input'); i.value = widgetUrl; document.body.appendChild(i); i.select(); document.execCommand('copy'); document.body.removeChild(i); }
    setCopied(true); showToast('Widget URL copied!'); setTimeout(() => setCopied(false), 2000);
  };

  const toggleMaintenance = async () => {
    const next = !maintenance;
    setMaintenance(next);
    await setMaintenanceStatus(next);
    showToast(next ? 'Maintenance ON' : 'Maintenance OFF');
  };

  // --- RENDER ---
  if (loading) return <div className="dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--text-muted)' }}>Loading...</p></div>;

  if (!session) {
    return (
      <div className="dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', background: 'var(--bg-card)', padding: 40, borderRadius: 16, border: '1px solid var(--border-color)' }}>
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>OverlayS Studio</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Manage your permanent OBS overlays.</p>
          <button className="btn btn-primary" onClick={handleLogin} style={{ padding: '12px 24px', fontSize: 16 }}>Sign in with Google</button>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', background: 'var(--bg-card)', padding: 40, borderRadius: 16, border: '1px solid var(--border-color)' }}>
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>Access Denied</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Only the admin can access this dashboard.</p>
          <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    );
  }

  const widgetUrl = `${window.location.origin}/overlays/widget?uid=${session.user.id}&preset=${canvasPreset}`;
  const hs = 8; // handle size

  return (
    <div className="dashboard" style={{ paddingBottom: 20 }}>
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1>OverlayS Studio</h1>
            <a href="/" className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}>ReactS</a>
          </div>
          <div className="subtitle" style={{ fontSize: 11 }}>
            {session.user.email} &bull; <button className="btn-ghost" onClick={handleLogout} style={{ border: 'none', cursor: 'pointer', padding: 0 }}>Logout</button>
            {admin && (
              <button className="btn-ghost" onClick={toggleMaintenance} style={{ marginLeft: 12, border: 'none', cursor: 'pointer', padding: 0, color: maintenance ? '#ff4444' : 'var(--text-muted)' }}>
                Maintenance: {maintenance ? 'ON' : 'OFF'}
              </button>
            )}
          </div>
        </div>
        <div className="header-actions">
          <a href="https://www.tiktok.com/@abdurcog" target="_blank" rel="noopener noreferrer" className="btn-social btn-tiktok" title="TikTok">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>
          </a>
          <a href="https://www.instagram.com/abdurcog" target="_blank" rel="noopener noreferrer" className="btn-social btn-instagram" title="Instagram">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.25-2.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/></svg>
          </a>
          <a href="https://saweria.co/abdurcogg" target="_blank" rel="noopener noreferrer" className="btn btn-donate">Donate</a>
        </div>
      </div>

      {/* Preset & URL Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Canvas:</span>
        {PRESETS.map(p => (
          <button key={p.id} className={`btn ${canvasPreset === p.id ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 11, padding: '4px 12px' }} onClick={() => setCanvasPreset(p.id)}>{p.label}</button>
        ))}
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>{preset.w}x{preset.h}</span>
        <div style={{ flex: 1 }} />
        <button className={`btn btn-copy ${copied ? 'copied' : ''}`} onClick={handleCopy} style={{ fontSize: 11, padding: '4px 12px' }}>{copied ? 'Copied!' : 'Copy Widget URL'}</button>
      </div>

      {/* === MAIN OBS LAYOUT === */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* --- CANVAS PREVIEW --- */}
        <div
          ref={canvasRef}
          style={{
            position: 'relative',
            width: '100%',
            height: canvasDisplayH,
            background: '#0a0a0a',
            border: '1px solid var(--border-color)',
            borderRadius: '6px 6px 0 0',
            overflow: 'hidden',
            cursor: dragState ? 'grabbing' : 'default',
          }}
          onClick={(e) => { if (e.target === e.currentTarget || e.target.closest('[data-canvas-bg]')) clearSelection(); }}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          <div data-canvas-bg style={{ position: 'absolute', inset: 0 }}>
            {/* Grid */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,0,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,0,0.08) 1px, transparent 1px)', backgroundSize: `${100/3}% ${100/3}%` }} />
            {/* Center crosshair */}
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,0,0,0.15)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,0,0,0.15)', pointerEvents: 'none' }} />

            {/* Render each overlay */}
            {configs.filter(c => c.visible !== false).map((cfg) => {
              const p = cfg.position || { x: Math.round((preset.w - (cfg.naturalWidth || 400) * ((cfg.scale || 100) / 100)) / 2), y: Math.round((preset.h - (cfg.naturalHeight || 400) * ((cfg.scale || 100) / 100)) / 2) };
              const nw = cfg.naturalWidth || 400;
              const nh = cfg.naturalHeight || 400;
              const s = (cfg.scale || 100) / 100;
              const w = nw * s;
              const h = cfg.itemType === 'text' ? nh * s : nh * s;
              const isSel = selectedIds.has(cfg.id);

              return (
                <div
                  key={cfg.id}
                  style={{
                    position: 'absolute',
                    left: p.x * scale,
                    top: p.y * scale,
                    width: w * scale,
                    height: h * scale,
                    border: isSel ? '2px solid #ff4444' : '1px solid rgba(255,255,255,0.1)',
                    boxSizing: 'border-box',
                    cursor: 'move',
                    zIndex: isSel ? 10 : 1,
                    opacity: (cfg.opacity ?? 100) / 100,
                    filter: `blur(${cfg.blur || 0}px) brightness(${cfg.brightness || 100}%)`,
                  }}
                  onMouseDown={(e) => startDrag(e, cfg.id, 'move', 'move')}
                  onClick={(e) => { e.stopPropagation(); selectSource(cfg.id, e.shiftKey); }}
                >
                  {/* Content */}
                  {cfg.itemType === 'text' ? (
                    <div style={{
                      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                      justifyContent: cfg.textAlign === 'left' ? 'flex-start' : cfg.textAlign === 'right' ? 'flex-end' : 'center',
                      color: cfg.textColor || '#fff',
                      fontFamily: cfg.fontFamily || 'Inter, sans-serif',
                      fontSize: Math.max(6, (cfg.fontSize || 48) * scale),
                      fontWeight: cfg.fontWeight || 'bold',
                      WebkitTextStroke: `${Math.max(0.5, (cfg.strokeWidth || 0) * scale)}px ${cfg.strokeColor || 'transparent'}`,
                      textShadow: `0 0 ${Math.max(1, 3 * scale)}px rgba(0,0,0,0.5)`,
                      overflow: 'hidden', whiteSpace: 'nowrap', padding: '0 4px',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                    }}>
                      {cfg.text || 'Text'}
                    </div>
                  ) : cfg.mediaUrl ? (
                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                      {cfg.mediaType === 'video'
                        ? <video src={cfg.mediaUrl} muted autoPlay loop playsInline style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
                        : <img src={cfg.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
                      }
                    </div>
                  ) : null}

                  {/* Resize handles (only selected) */}
                  {isSel && [
                    { id: 'nw', s: { top: -hs/2, left: -hs/2, cursor: 'nw-resize' } },
                    { id: 'n',  s: { top: -hs/2, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
                    { id: 'ne', s: { top: -hs/2, right: -hs/2, cursor: 'ne-resize' } },
                    { id: 'w',  s: { top: '50%', left: -hs/2, transform: 'translateY(-50%)', cursor: 'w-resize' } },
                    { id: 'e',  s: { top: '50%', right: -hs/2, transform: 'translateY(-50%)', cursor: 'e-resize' } },
                    { id: 'sw', s: { bottom: -hs/2, left: -hs/2, cursor: 'sw-resize' } },
                    { id: 's',  s: { bottom: -hs/2, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
                    { id: 'se', s: { bottom: -hs/2, right: -hs/2, cursor: 'se-resize' } },
                  ].map(handle => (
                    <div key={handle.id} onMouseDown={(e) => startDrag(e, cfg.id, 'resize', handle.id)} style={{ position: 'absolute', width: hs, height: hs, background: '#ff4444', borderRadius: '50%', zIndex: 20, ...handle.s }} />
                  ))}

                  {/* Size labels (selected only) */}
                  {isSel && (
                    <>
                      <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: '#ff8888', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{Math.round(p.y)} px</div>
                      <div style={{ position: 'absolute', left: -40, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#ff8888', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{Math.round(p.x)} px</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* --- BOTTOM PANELS --- */}
        <div style={{ display: 'flex', gap: 2, minHeight: 200 }}>

          {/* SOURCES PANEL */}
          <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0 0 0 6px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Sources</div>

            {/* Source list */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {configs.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No sources. Add an overlay.</div>
              )}
              {configs.map((cfg, idx) => (
                <div
                  key={cfg.id}
                  onClick={(e) => selectSource(cfg.id, e.shiftKey)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', cursor: 'pointer',
                    background: selectedIds.has(cfg.id) ? 'var(--accent-cyan-dim)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    fontSize: 12, color: cfg.visible === false ? '#555' : 'var(--text-primary)',
                  }}
                >
                  <div onClick={(e) => { e.stopPropagation(); toggleVisibility(cfg.id); }} style={{ cursor: 'pointer', flexShrink: 0 }}>
                    <EyeIcon visible={cfg.visible !== false} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 28, textAlign: 'center', flexShrink: 0 }}>
                    {cfg.itemType === 'text' ? 'TXT' : cfg.mediaType === 'video' ? 'VID' : 'IMG'}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cfg.title || cfg.text || cfg.fileName || 'Untitled'}
                  </span>
                </div>
              ))}
            </div>

            {/* Source toolbar */}
            <div style={{ display: 'flex', gap: 2, padding: 4, borderTop: '1px solid var(--border-color)' }}>
              <div style={{ position: 'relative' }} ref={addMenuRef}>
                <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setShowAddMenu(v => !v)}>+</button>
                {showAddMenu && (
                  <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 4, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 4, zIndex: 50, minWidth: 160, overflow: 'hidden' }}>
                    <button style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer', fontSize: 12 }} onClick={() => { setEditingConfig(null); setShowMediaModal(true); setShowAddMenu(false); }} onMouseEnter={e => e.target.style.background='var(--bg-secondary)'} onMouseLeave={e => e.target.style.background='none'}>
                      Add Image / Video
                    </button>
                    <button style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer', fontSize: 12, borderTop: '1px solid var(--border-color)' }} onClick={() => { setEditingConfig(null); setShowTextModal(true); setShowAddMenu(false); }} onMouseEnter={e => e.target.style.background='var(--bg-secondary)'} onMouseLeave={e => e.target.style.background='none'}>
                      Add Text
                    </button>
                  </div>
                )}
              </div>
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => selectedIds.size > 0 && handleDelete([...selectedIds])} disabled={selectedIds.size === 0}>-</button>
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => { if (selected) { setEditingConfig(selected); if (selected.itemType === 'text') setShowTextModal(true); else setShowMediaModal(true); } }} disabled={!selected}>Edit</button>
            </div>
          </div>

          {/* PROPERTIES PANEL */}
          <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0 0 6px 0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Properties</div>

            {selected ? (
              <div style={{ flex: 1, overflow: 'auto', padding: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{selected.title || selected.text || selected.fileName || 'Untitled'}</div>

                {/* Position + Center button */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>X</div>
                    <input type="number" className="form-input" style={{ padding: '4px 6px', fontSize: 12 }} value={selected.position?.x || 0} onChange={(e) => updateProperty('position', { ...selected.position, x: Number(e.target.value) })} onBlur={() => saveProperty({ position: selected.position })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Y</div>
                    <input type="number" className="form-input" style={{ padding: '4px 6px', fontSize: 12 }} value={selected.position?.y || 0} onChange={(e) => updateProperty('position', { ...selected.position, y: Number(e.target.value) })} onBlur={() => saveProperty({ position: selected.position })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Scale %</div>
                    <input type="number" className="form-input" style={{ padding: '4px 6px', fontSize: 12 }} value={selected.scale || 100} onChange={(e) => updateProperty('scale', Number(e.target.value))} onBlur={() => saveProperty({ scale: selected.scale })} />
                  </div>
                  <button className="btn btn-ghost" onClick={centerSelected} title="Set to Center" style={{ padding: '4px 8px', fontSize: 11, whiteSpace: 'nowrap' }}>Center</button>
                </div>

                {/* Opacity / Blur / Brightness */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Opacity ({selected.opacity ?? 100}%)</div>
                  <input type="range" min="0" max="100" value={selected.opacity ?? 100} onChange={(e) => updateProperty('opacity', Number(e.target.value))} onMouseUp={() => saveProperty({ opacity: selected.opacity })} style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Blur ({selected.blur || 0}px)</div>
                    <input type="range" min="0" max="20" value={selected.blur || 0} onChange={(e) => updateProperty('blur', Number(e.target.value))} onMouseUp={() => saveProperty({ blur: selected.blur })} style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Bright ({selected.brightness ?? 100}%)</div>
                    <input type="range" min="0" max="200" value={selected.brightness ?? 100} onChange={(e) => updateProperty('brightness', Number(e.target.value))} onMouseUp={() => saveProperty({ brightness: selected.brightness })} style={{ width: '100%' }} />
                  </div>
                </div>

                {/* Text-specific */}
                {selected.itemType === 'text' && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 8, marginTop: 4 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Text: {selected.text}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Font: {selected.fontFamily} | Size: {selected.fontSize}px | Color: {selected.textColor}</div>
                  </div>
                )}

                {/* Media info */}
                {selected.itemType !== 'text' && selected.mediaUrl && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 8, marginTop: 4 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{selected.fileName || 'Media'} ({selected.naturalWidth}x{selected.naturalHeight})</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                Select a source
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Widget URL (small) */}
      <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        Widget: {widgetUrl}
      </div>

      {/* Footer */}
      <div className="dashboard-footer" style={{ marginTop: 12 }}>
        <a href="https://www.instagram.com/abdurcog" target="_blank" rel="noopener noreferrer" className="credit-link">Made by @abdurcog</a>
        <span className="credit-divider">|</span>
        <a href="https://www.instagram.com/kurohiko_id" target="_blank" rel="noopener noreferrer" className="credit-link">Inspired by @kurohiko_id</a>
      </div>

      {/* Modals */}
      {showMediaModal && (
        <MediaConfigModal
          config={editingConfig}
          onSave={handleSave}
          onClose={() => { setShowMediaModal(false); setEditingConfig(null); }}
          defaultType="overlays"
          canvasPreset={canvasPreset}
        />
      )}
      {showTextModal && (
        <TextLayerModal
          config={editingConfig}
          onSave={handleSave}
          onClose={() => { setShowTextModal(false); setEditingConfig(null); }}
          preset={canvasPreset}
        />
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
