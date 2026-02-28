// Cross-tab communication via localStorage events
// Works reliably across tabs in the same browser
// For OBS: both dashboard and widget must be on the same deployed URL

const TRIGGER_KEY = 'overlay_trigger_event';

/**
 * Trigger a media overlay by writing to localStorage.
 * The Widget tab listens for the 'storage' event.
 * We only send the media ID - the Widget reads the full config from localStorage.
 */
export function triggerMedia(mediaId) {
  const event = {
    type: 'TRIGGER_MEDIA',
    mediaId: mediaId,
    timestamp: Date.now(),
  };
  // Remove first to ensure the event fires even if same ID is triggered again
  localStorage.removeItem(TRIGGER_KEY);
  // Small delay to ensure removal is processed
  setTimeout(() => {
    localStorage.setItem(TRIGGER_KEY, JSON.stringify(event));
  }, 50);
}

export function hideMedia() {
  const event = {
    type: 'HIDE_MEDIA',
    timestamp: Date.now(),
  };
  localStorage.removeItem(TRIGGER_KEY);
  setTimeout(() => {
    localStorage.setItem(TRIGGER_KEY, JSON.stringify(event));
  }, 50);
}

/**
 * Listen for trigger events from another tab.
 * Uses the 'storage' event which fires when localStorage is changed from another tab.
 */
export function onTrigger(callback) {
  const handler = (e) => {
    if (e.key === TRIGGER_KEY && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        callback(data);
      } catch {
        // ignore parse errors
      }
    }
  };

  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener('storage', handler);
  };
}
