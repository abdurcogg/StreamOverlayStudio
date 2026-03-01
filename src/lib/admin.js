import { supabase } from './supabase';

export const ADMIN_EMAIL = 'abdurrahmanrafiwoi@gmail.com';

export function isAdmin(email) {
  return email === ADMIN_EMAIL;
}

// Maintenance: ALWAYS default to false (not under maintenance).
// Only return true if we can CONFIRM it's ON in the database.
export async function getMaintenanceStatus() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'maintenance')
      .single();

    if (error || !data) return false;
    return data.value === 'true' || data.value === true;
  } catch {
    return false;
  }
}

export async function setMaintenanceStatus(enabled) {
  const val = enabled ? 'true' : 'false';

  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'maintenance', value: val }, { onConflict: 'key' });

    if (error) {
      console.warn('Could not save maintenance to DB:', error.message);
      // Fallback: store in user metadata or just warn
      return false;
    }
    return true;
  } catch {
    console.warn('Maintenance save failed.');
    return false;
  }
}
