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
  const outTimerRef = useRef(null);
  const videoRef = useRef(null);
  const sfxRef = useRef(null);

  useEffect(() => {
    if (activeMedia?.mediaType === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(e => console.error('Video autoplay error:', e));
    }
  }, [activeMedia]);

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (outTimerRef.current) {
      clearTimeout(outTimerRef.current);
      outTimerRef.current = null;
    }
  }, []);

  const showNewMedia = useCallback((config) => {
    clearTimers();

    setActiveMedia(config);
    setAnimClass(`anim-${config.animationIn}`);
    setIsVisible(true);

    if (config.sfxUrl) {
      try {
        if (sfxRef.current) {
          sfxRef.current.pause();
          sfxRef.current = null;
        }
        const sfx = new Audio(config.sfxUrl);
        sfx.volume = (Number(config.sfxVolume) ?? 80) / 100;
        sfx.play().catch(() => {});
        sfxRef.current = sfx;
      } catch {}
    }

    const durationNum = Number(config.duration);
    if (durationNum > 0) {
      console.log(`Setting auto-hide timer for ${durationNum} seconds...`);
      hideTimerRef.current = setTimeout(() => {
        console.log(`Auto-hide triggered. Starting out-animation: ${config.animationOut}`);
        setAnimClass(`anim-${config.animationOut}`);

        const outSpeed = Number(config.animationOutSpeed) || 0.5;
        outTimerRef.current = setTimeout(() => {
          console.log(`Out-animation finished. Removing media from DOM.`);
          setIsVisible(false);
          setActiveMedia(null);
          setAnimClass('');
        }, outSpeed * 1000);
      }, durationNum * 1000);
    }
  }, [clearTimers]);

  useEffect(() => {
    if (!userId) {
      console.warn('OBS Widget: No uid parameter provided in URL');
      return;
    }

    const cleanup = onTrigger(userId, async (data) => {
      if (data.type === 'TRIGGER_MEDIA' && data.mediaId) {
        const config = await getMediaConfigById(data.mediaId);
        if (config) {
          clearTimers();
          
          if (activeMedia && activeMedia.id === config.id) {
            // Force re-trigger of same animation by briefly resetting
            setAnimClass('');
            requestAnimationFrame(() => {
              showNewMedia(config);
            });
          } else {
            showNewMedia(config);
          }
        }
      } else if (data.type === 'HIDE_MEDIA') {
        setActiveMedia(current => {
          if (current) {
            setAnimClass(`anim-${current.animationOut}`);
            setTimeout(() => {
              setIsVisible(false);
              setActiveMedia(null);
              setAnimClass('');
            }, (current.animationOutSpeed || 0.5) * 1000);
          }
          return current;
        });
      }
    });

    return () => cleanup();
  }, [showNewMedia, userId]);

  useEffect(() => {
    return () => clearTimers();
  }, []);

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

  const cropT = activeMedia.crop?.top || 0;
  const cropB = activeMedia.crop?.bottom || 0;
  const cropL = activeMedia.crop?.left || 0;
  const cropR = activeMedia.crop?.right || 0;

  const croppedNw = nw * Math.max(0.01, 1 - (cropL + cropR) / 100);
  const croppedNh = nh * Math.max(0.01, 1 - (cropT + cropB) / 100);

  const dispW = croppedNw * scale;
  const dispH = croppedNh * scale;

  const innerW_Ratio = 100 / Math.max(0.01, 100 - cropL - cropR);
  const innerH_Ratio = 100 / Math.max(0.01, 100 - cropT - cropB);

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
          overflow: 'hidden',
          animationDuration: `${animDuration}s`,
          animationFillMode: 'both',
          animationTimingFunction: 'ease-in-out',
        }}
      >
        <div style={{
          position: 'absolute',
          width: `${innerW_Ratio * 100}%`,
          height: `${innerH_Ratio * 100}%`,
          left: `-${cropL * innerW_Ratio}%`,
          top: `-${cropT * innerH_Ratio}%`,
        }}>
          {activeMedia.mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={activeMedia.mediaUrl}
              autoPlay
              playsInline
              loop
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <img
              src={activeMedia.mediaUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
