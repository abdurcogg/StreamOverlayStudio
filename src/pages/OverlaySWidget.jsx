import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const CANVAS_PRESETS = {
  youtube: { w: 1920, h: 1080 },
  tiktok:  { w: 1080, h: 1920 },
  square:  { w: 1080, h: 1080 },
};

export default function OverlaySWidget() {
  const [overlays, setOverlays] = useState([]);
  const [preset, setPreset] = useState('youtube');

  useEffect(() => {
    document.body.classList.add('widget-page');

    const params = new URLSearchParams(window.location.search);
    const userId = params.get('uid');
    const presetId = params.get('preset') || 'youtube';
    setPreset(presetId);

    if (!userId) return;

    const fetchOverlays = async () => {
      const { data, error } = await supabase
        .from('media_configs')
        .select('*')
        .eq('user_id', userId);

      if (!error && data) {
        const filtered = data
          .filter(row => (row.config?.type || 'reacts') === 'overlays')
          .filter(row => row.config?.visible !== false)
          .map(row => ({ id: row.id, ...row.config }));
        setOverlays(filtered);
      }
    };

    fetchOverlays();

    const channel = supabase
      .channel('overlays-widget-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media_configs', filter: `user_id=eq.${userId}` }, () => fetchOverlays())
      .subscribe();

    return () => {
      document.body.classList.remove('widget-page');
      supabase.removeChannel(channel);
    };
  }, []);

  const canvas = CANVAS_PRESETS[preset] || CANVAS_PRESETS.youtube;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, overflow: 'hidden', background: 'transparent' }}>
      <style>{`
        @keyframes marquee-left {
          0% { transform: translateX(150%); }
          100% { transform: translateX(-150%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(150%); }
        }
        .overlay-item { position: absolute; pointer-events: none; }
      `}</style>

      {overlays.map((item) => {
        const pos = item.position || { x: 0, y: 0 };
        const naturalW = item.naturalWidth || 400;
        const naturalH = item.naturalHeight || 400;
        const itemScale = (item.scale || 100) / 100;
        const itemW = naturalW * itemScale;
        const itemH = naturalH * itemScale;

        // Scale the canvas coordinates to actual viewport
        const scaleX = window.innerWidth / canvas.w;
        const scaleY = window.innerHeight / canvas.h;
        const s = Math.min(scaleX, scaleY);

        const crop = item.crop || { top: 0, bottom: 0, left: 0, right: 0 };
        const cropClip = `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`;

        const filterVal = `blur(${item.blur || 0}px) brightness(${item.brightness || 100}%)`;

        return (
          <div
            key={item.id}
            className="overlay-item"
            style={{
              left: pos.x * s,
              top: pos.y * s,
              width: itemW * s,
              height: item.itemType === 'text' ? 'auto' : itemH * s,
              opacity: (item.opacity ?? 100) / 100,
              filter: filterVal,
              zIndex: item.zIndex || 1,
              overflow: item.itemType === 'text' ? 'hidden' : 'visible',
              clipPath: item.itemType !== 'text' ? cropClip : 'none',
            }}
          >
            {item.itemType === 'text' ? (
              // Text layer
              <div style={{
                fontFamily: item.fontFamily || 'Inter, sans-serif',
                fontSize: (item.fontSize || 48) * s,
                fontWeight: item.fontWeight || 'bold',
                color: item.textColor || '#ffffff',
                textShadow: `${item.strokeWidth || 2}px ${item.strokeWidth || 2}px 4px ${item.strokeColor || '#000000'}`,
                WebkitTextStroke: `${item.strokeWidth || 2}px ${item.strokeColor || '#000000'}`,
                textAlign: item.textAlign || 'center',
                whiteSpace: 'nowrap',
                animation: item.isScrolling ? `marquee-${item.scrollDirection || 'left'} ${Math.max(2, 16 - (item.scrollSpeed || 5))}s linear infinite` : 'none',
                display: 'inline-block',
              }}>
                {item.text}
              </div>
            ) : (
              // Media layer (image/video/gif)
              item.mediaUrl && (
                item.mediaType === 'video' ? (
                  <video
                    src={item.mediaUrl}
                    autoPlay loop muted playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
                  />
                ) : (
                  <img
                    src={item.mediaUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
                  />
                )
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
