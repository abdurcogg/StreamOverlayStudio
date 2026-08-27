import { supabase } from './supabase';

/**
 * Triggers a media overlay via Supabase Realtime across devices.
 */
export async function triggerMedia(mediaIdOrConfig) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const isObject = typeof mediaIdOrConfig === 'object' && mediaIdOrConfig !== null;
  const mediaId = isObject ? mediaIdOrConfig.id : mediaIdOrConfig;
  const config = isObject ? mediaIdOrConfig : null;

  const channel = supabase.channel(`overlay-${user.id}`);
  
  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.send({
        type: 'broadcast',
        event: 'TRIGGER_MEDIA',
        payload: { mediaId, config, timestamp: Date.now() },
      });
      // Berikan delay sebelum removeChannel agar websocket selesai mengirim packet
      setTimeout(() => {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }, 1000);
    }
  });
}

/**
 * Hides active media via Supabase Realtime across devices.
 */
export async function hideMedia() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const channel = supabase.channel(`overlay-${user.id}`);
  
  await channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.send({
        type: 'broadcast',
        event: 'HIDE_MEDIA',
        payload: { timestamp: Date.now() },
      });
      supabase.removeChannel(channel);
    }
  });
}

/**
 * Listens for remote trigger events in the OBS widget.
 * @param {string} userId - The user ID passed in the widget URL.
 * @param {function} callback - Callback function receiving payload data.
 */
export function onTrigger(userId, callback) {
  if (!userId) return () => {};

  const channel = supabase.channel(`overlay-${userId}`);

  channel
    .on('broadcast', { event: 'TRIGGER_MEDIA' }, (payload) => callback({ type: 'TRIGGER_MEDIA', ...payload.payload }))
    .on('broadcast', { event: 'HIDE_MEDIA' }, (payload) => callback({ type: 'HIDE_MEDIA', ...payload.payload }))
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
