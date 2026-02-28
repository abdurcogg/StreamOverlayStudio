// Store - localStorage based state management for media configs

const STORAGE_KEY = 'overlay_media_configs';
const WIDGET_ID_KEY = 'overlay_widget_id';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function getWidgetId() {
  let id = localStorage.getItem(WIDGET_ID_KEY);
  if (!id) {
    id = generateId();
    localStorage.setItem(WIDGET_ID_KEY, id);
  }
  return id;
}

export function loadMediaConfigs() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveMediaConfigs(configs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export function addMediaConfig(config) {
  const configs = loadMediaConfigs();
  const newConfig = {
    id: generateId(),
    mediaUrl: config.mediaUrl || '',
    mediaType: config.mediaType || 'image',
    fileName: config.fileName || 'untitled',
    animationIn: config.animationIn || 'fadeIn',
    animationOut: config.animationOut || 'fadeOut',
    animationInSpeed: config.animationInSpeed ?? 0.5,
    animationOutSpeed: config.animationOutSpeed ?? 0.5,
    duration: config.duration ?? 5,
    position: config.position || { x: 760, y: 340 },
    scale: config.scale ?? 100,
    maxWidth: config.maxWidth ?? 400,
    maxHeight: config.maxHeight ?? 400,
    naturalWidth: config.naturalWidth ?? 400,
    naturalHeight: config.naturalHeight ?? 400,
    volume: config.volume ?? 80,
    sfxUrl: config.sfxUrl || '',
    sfxFileName: config.sfxFileName || '',
    sfxVolume: config.sfxVolume ?? 80,
  };
  configs.push(newConfig);
  saveMediaConfigs(configs);
  return newConfig;
}

export function updateMediaConfig(id, updates) {
  const configs = loadMediaConfigs();
  const idx = configs.findIndex(c => c.id === id);
  if (idx !== -1) {
    configs[idx] = { ...configs[idx], ...updates };
    saveMediaConfigs(configs);
    return configs[idx];
  }
  return null;
}

export function deleteMediaConfig(id) {
  const configs = loadMediaConfigs().filter(c => c.id !== id);
  saveMediaConfigs(configs);
  return configs;
}

export function getMediaConfig(id) {
  return loadMediaConfigs().find(c => c.id === id) || null;
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
