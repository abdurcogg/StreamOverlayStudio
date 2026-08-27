let senderChannel = null;
let senderUserId = null;

function getSenderChannel(userId) {
  if (senderChannel && senderUserId === userId) {
    return senderChannel;
  }
  if (senderChannel) {
    try { supabase.removeChannel(senderChannel); } catch {}
  }
  senderUserId = userId;
  senderChannel = supabase.channel(`overlay-${userId}`);
  senderChannel.subscribe();
  return senderChannel;
}

/**
 * Triggers a media overlay via Supabase Realtime across devices.
 * Supports rapid spam triggering without reconnect delay.
 */
export async function triggerMedia(mediaIdOrConfig) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const isObject = typeof mediaIdOrConfig === 'object' && mediaIdOrConfig !== null;
  const mediaId = isObject ? mediaIdOrConfig.id : mediaIdOrConfig;
  const config = isObject ? mediaIdOrConfig : null;

  const channel = getSenderChannel(user.id);

  channel.send({
    type: 'broadcast',
    event: 'TRIGGER_MEDIA',
    payload: { 
      mediaId, 
      config, 
      timestamp: Date.now(),
      triggerId: Date.now() + '-' + Math.random().toString(36).substring(2, 7)
    },
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
