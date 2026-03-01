import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { loadMediaConfigs } from '../lib/store';

export default function OverlaySWidget() {
  const [overlays, setOverlays] = useState([]);
  const [aspectRatio, setAspectRatio] = useState('16/9'); // Default YouTube

  useEffect(() => {
    // Add transparent background class
    document.body.classList.add('widget-page');

    const params = new URLSearchParams(window.location.search);
    const userId = params.get('uid');
    const preset = params.get('preset') || 'youtube';

    // Set Aspect Ratio based on preset
    if (preset === 'tiktok') setAspectRatio('9/16');
    else if (preset === 'youtube') setAspectRatio('16/9');
    else if (preset === 'custom') {
      const w = params.get('w');
      const h = params.get('h');
      if (w && h) setAspectRatio(`${w}/${h}`);
    }

    if (!userId) return;

    // Initial load
    const fetchOverlays = async () => {
      const { data, error } = await supabase
        .from('media_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'overlays');
      
      if (!error && data) {
        setOverlays(data.map(row => ({ id: row.id, ...row.config })));
      }
    };

    fetchOverlays();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('overlays-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'media_configs', filter: `user_id=eq.${userId}` },
        (payload) => {
          fetchOverlays(); // Simple re-fetch for now to ensure correct ordering/filtering
        }
      )
      .subscribe();

    return () => {
      document.body.classList.remove('widget-page');
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="overlays-container" style={{ 
      width: '100vw', 
      height: '100vh', 
      position: 'relative', 
      overflow: 'hidden',
      aspectRatio: aspectRatio,
      margin: '0 auto'
    }}>
      <style>
        {`
          @keyframes marquee-left {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          @keyframes marquee-right {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .scrolling-text {
            white-space: nowrap;
            display: inline-block;
          }
        `}
      </style>
      {overlays.filter(item => item.visible !== false).map((item) => (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            left: `${item.x}%`,
            top: `${item.y}%`,
            width: `${item.scale * 10}%`,
            transform: `translate(-50%, -50%)`,
            zIndex: item.zIndex || 1,
            pointerEvents: 'none',
            opacity: (item.opacity ?? 100) / 100,
            filter: `blur(${item.blur || 0}px) brightness(${item.brightness || 100}%)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          {item.mediaUrl && (
            item.mediaType === 'video' ? (
              <video
                src={item.mediaUrl}
                autoPlay
                loop
                muted
                playsInline
                style={{ width: '100%', display: 'block' }}
              />
            ) : (
              <img
                src={item.mediaUrl}
                alt=""
                style={{ width: '100%', display: 'block' }}
              />
            )
          )}
          
          {item.text && (
            <div style={{ 
              width: '100%', 
              overflow: 'hidden', 
              marginTop: '4px',
              textAlign: 'center',
              color: 'white',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}>
              <div className={item.isScrolling ? 'scrolling-text' : ''} style={{
                animation: item.isScrolling ? `marquee-${item.scrollDirection || 'left'} ${15 - (item.scrollSpeed || 5)}s linear infinite` : 'none'
              }}>
                {item.text}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
