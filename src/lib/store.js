import { supabase } from './supabase';

const WIDGET_ID_KEY = 'overlay_widget_id';

export function getWidgetId() {
  let id = localStorage.getItem(WIDGET_ID_KEY);
  if (!id) {
    id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(WIDGET_ID_KEY, id);
  }
  return id;
}

// Convert base64 to Blob
async function base64ToBlob(base64Url) {
  const res = await fetch(base64Url);
  return res.blob();
}

/**
 * Uploads base64 media to Supabase Storage and returns the public URL.
 * If the url is already a Supabase public URL, just returns it.
 */
async function uploadMedia(userId, base64Url, fileName) {
  if (!base64Url || base64Url.startsWith('http')) return base64Url;

  const blob = await base64ToBlob(base64Url);
  const ext = fileName.split('.').pop() || 'png';
  const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

  const { data, error } = await supabase.storage
    .from('media')
    .upload(filePath, blob, { upsert: false });

  if (error) {
    console.error('Upload Error:', error);
    throw error;
  }

  const { data: publicData } = supabase.storage.from('media').getPublicUrl(filePath);
  return publicData.publicUrl;
}

export async function loadMediaConfigs(type = 'reacts') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch ALL configs for this user - filter by type in JS to avoid schema column dependency
  const { data, error } = await supabase
    .from('media_configs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch Configs Error:', error);
    return [];
  }

  // Filter by type stored inside the JSONB config field
  return data
    .filter(row => (row.config?.type || 'reacts') === type)
    .map(row => ({ id: row.id, ...row.config }));
}

export async function addMediaConfig(config, type = 'reacts') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');

  const mediaUrl = await uploadMedia(user.id, config.mediaUrl || '', config.fileName || 'file');
  const sfxUrl = config.sfxUrl ? await uploadMedia(user.id, config.sfxUrl, config.sfxFileName || 'sfx') : '';

  // Store type INSIDE the config JSONB - no separate column needed
  const finalConfig = {
    ...config,
    type,        // ← stored in JSONB
    mediaUrl,
    sfxUrl,
    id: undefined,
  };

  const { data, error } = await supabase
    .from('media_configs')
    .insert([{ user_id: user.id, config: finalConfig }])  // ← no top-level type column
    .select()
    .single();

  if (error) throw error;
  return { id: data.id, ...data.config };
}

export async function updateMediaConfig(id, updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');

  let mediaUrl = updates.mediaUrl;
  if (mediaUrl && mediaUrl.startsWith('data:')) {
    mediaUrl = await uploadMedia(user.id, mediaUrl, updates.fileName);
  }

  let sfxUrl = updates.sfxUrl;
  if (sfxUrl && sfxUrl.startsWith('data:')) {
    sfxUrl = await uploadMedia(user.id, sfxUrl, updates.sfxFileName);
  }

  const finalUpdates = {
    ...updates,
    mediaUrl: mediaUrl || updates.mediaUrl,
    sfxUrl: sfxUrl !== undefined ? sfxUrl : updates.sfxUrl,
  };

  // Fetch current config block
  const { data: current, error: fetchErr } = await supabase
    .from('media_configs')
    .select('config')
    .eq('id', id)
    .single();

  if (fetchErr) throw fetchErr;

  const newConfig = { ...current.config, ...finalUpdates };

  const { data, error } = await supabase
    .from('media_configs')
    .update({ config: newConfig })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return { id: data.id, ...data.config };
}

export async function deleteMediaConfig(id) {
  // 1. Fetch current config to find associated files
  const { data: current, error: fetchErr } = await supabase
    .from('media_configs')
    .select('config')
    .eq('id', id)
    .single();

  if (fetchErr) throw fetchErr;

  const config = current.config;
  const filesToDelete = [];

  const extractStoragePath = (url) => {
    if (!url || typeof url !== 'string') return null;
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/public/media/');
      if (parts.length > 1) {
        return parts[1]; // Returns path like userId/filename.ext
      }
    } catch (e) {}
    return null;
  };

  const mediaPath = extractStoragePath(config.mediaUrl);
  if (mediaPath) filesToDelete.push(mediaPath);

  const sfxPath = extractStoragePath(config.sfxUrl);
  if (sfxPath) filesToDelete.push(sfxPath);

  // 2. Delete files from storage bucket
  if (filesToDelete.length > 0) {
    const { error: storageErr } = await supabase.storage.from('media').remove(filesToDelete);
    if (storageErr) {
      console.error('Failed to delete media from storage:', storageErr);
      // We log but continue, so the DB record is still deleted
    }
  }

  // 3. Delete database record
  const { error } = await supabase
    .from('media_configs')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function getMediaConfigById(id) {
  const { data, error } = await supabase
    .from('media_configs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return { id: data.id, ...data.config };
}

export const ANIMATION_OPTIONS = [
  { value: 'fadeIn', label: 'Fade In' },
  { value: 'pop', label: 'Pop' },
  { value: 'slideUp', label: 'Slide Up' },
  { value: 'slideDown', label: 'Slide Down' },
  { value: 'slideLeft', label: 'Slide Left' },
  { value: 'slideRight', label: 'Slide Right' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'zoomRotate', label: 'Zoom+Rotate' },
  { value: 'flip', label: 'Flip' },
];

export const ANIMATION_OUT_OPTIONS = [
  { value: 'fadeOut', label: 'Fade Out' },
  { value: 'popOut', label: 'Pop' },
  { value: 'slideUpOut', label: 'Slide Up' },
  { value: 'slideDownOut', label: 'Slide Down' },
  { value: 'slideLeftOut', label: 'Slide Left' },
  { value: 'slideRightOut', label: 'Slide Right' },
  { value: 'bounceOut', label: 'Bounce' },
  { value: 'zoomRotateOut', label: 'Zoom+Rotate' },
  { value: 'flipOut', label: 'Flip' },
];
