import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { onTrigger } from '../lib/channel';
import { getMediaConfigById } from '../lib/store';
import '../lib/animations.css';

export default function Widget() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('uid');

  const [activeMedia, setActiveMedia] = useState(null);
  const [animClass, setAnimClass] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const hideTimerRef = useRef(null);
  const videoRef = useRef(null);
  const sfxRef = useRef(null);

  const clearTimers = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const showNewMedia = useCallback((config) => {
    clearTimers();

    setActiveMedia(config);
    setAnimClass(`anim-${config.animationIn}`);
    setIsVisible(true);

    // Play SFX if configured
    if (config.sfxUrl) {
      try {
        if (sfxRef.current) {
          sfxRef.current.pause();
          sfxRef.current = null;
        }
        const sfx = new Audio(config.sfxUrl);
        sfx.volume = (config.sfxVolume ?? 80) / 100;
        sfx.play().catch(() => {});
        sfxRef.current = sfx;
      } catch {
        // ignore audio errors
      }
    }

    // Auto-hide after duration
    if (config.duration > 0) {
      hideTimerRef.current = setTimeout(() => {
        // Trigger out animation
        setAnimClass(`anim-${config.animationOut}`);

        setTimeout(() => {
          setIsVisible(false);
          setActiveMedia(null);
          setAnimClass('');
        }, (config.animationOutSpeed || 0.5) * 1000);
      }, config.duration * 1000);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      console.warn('OBS Widget: No uid parameter provided in URL');
      return;
    }

    const cleanup = onTrigger(userId, async (data) => {
      if (data.type === 'TRIGGER_MEDIA' && data.mediaId) {
        // Fetch config from Supabase cloud via ID
        const config = await getMediaConfigById(data.mediaId);
        if (config) {
          // If something is already showing, clear it first
          clearTimers();
          setIsVisible(false);
          setActiveMedia(null);
          setAnimClass('');

          // Small delay before showing new one
          setTimeout(() => {
            showNewMedia(config);
          }, 100);
        }
      } else if (data.type === 'HIDE_MEDIA') {
        if (activeMedia) {
          setAnimClass(`anim-${activeMedia.animationOut}`);
          setTimeout(() => {
            setIsVisible(false);
            setActiveMedia(null);
            setAnimClass('');
          }, (activeMedia?.animationOutSpeed || 0.5) * 1000);
        }
      }
    });

    return () => {
      cleanup();
      clearTimers();
    };
  }, [showNewMedia, userId, activeMedia]);

  // Set video volume when activeMedia changes
  useEffect(() => {
    if (videoRef.current && activeMedia) {
      videoRef.current.volume = (activeMedia.volume ?? 80) / 100;
    }
  }, [activeMedia]);

  if (!userId) {
    return <div style={{ color: 'red', margin: 20 }}>Error: Missing ?uid= parameter in URL. Copy the link from your Dashboard.</div>;
  }

  if (!isVisible || !activeMedia) {
    return (
      <div style={{
        width: '1920px',
        height: '1080px',
        background: 'transparent',
        position: 'relative',
      }} />
    );
  }

  const pos = activeMedia.position || { x: 760, y: 340 };
  const scale = (activeMedia.scale || 100) / 100;
  const nw = activeMedia.naturalWidth || activeMedia.maxWidth || 400;
  const nh = activeMedia.naturalHeight || activeMedia.maxHeight || 400;
  const dispW = nw * scale;
  const dispH = nh * scale;

  const inSpeed = activeMedia.animationInSpeed || 0.5;
  const outSpeed = activeMedia.animationOutSpeed || 0.5;
  const isOutAnim = animClass.includes('Out');
  const animDuration = isOutAnim ? outSpeed : inSpeed;

  return (
    <div style={{
      width: '1920px',
      height: '1080px',
      background: 'transparent',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div
        className={animClass}
        style={{
          position: 'absolute',
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          width: `${dispW}px`,
          height: `${dispH}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animationDuration: `${animDuration}s`,
          animationFillMode: 'both',
          animationTimingFunction: 'ease-out',
        }}
      >
        {activeMedia.mediaType === 'video' ? (
          <video
            ref={videoRef}
            src={activeMedia.mediaUrl}
            autoPlay
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <img
            src={activeMedia.mediaUrl}
            alt=""
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        )}
      </div>
    </div>
  );
}
