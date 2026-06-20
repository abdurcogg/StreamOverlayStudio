import { supabase } from './supabase';

let senderChannel = null;
let subscriptionPromise = null;

async function getSenderChannel() {
  if (senderChannel) {
    await subscriptionPromise;
    return senderChannel;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  senderChannel = supabase.channel(`overlay-${user.id}`);
  
  subscriptionPromise = new Promise((resolve, reject) => {
    senderChannel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        resolve();
      }
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        senderChannel = null;
        subscriptionPromise = null;
        reject(err);
      }
    });
  });

  try {
    await subscriptionPromise;
    return senderChannel;
  } catch (e) {
    return null;
  }
}

/**
 * Triggers a media overlay via Supabase Realtime across devices.
 */
export async function triggerMedia(mediaId) {
  const channel = await getSenderChannel();
  if (!channel) return;

  await channel.send({
    type: 'broadcast',
    event: 'TRIGGER_MEDIA',
    payload: { mediaId, timestamp: Date.now() },
  });
}

/**
 * Hides active media via Supabase Realtime across devices.
 */
export async function hideMedia() {
  const channel = await getSenderChannel();
  if (!channel) return;

  await channel.send({
    type: 'broadcast',
    event: 'HIDE_MEDIA',
    payload: { timestamp: Date.now() },
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
