import { supabase } from './supabase';

export const ADMIN_EMAIL = 'abdurrahmanrafiwoi@gmail.com';

export function isAdmin(email) {
  return email === ADMIN_EMAIL;
}

// Maintenance status stored in Supabase app_settings table (key: 'maintenance')
// Fallback: localStorage if table doesn't exist

export async function getMaintenanceStatus() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'maintenance')
      .single();

    if (error || !data) {
      // Fallback to localStorage
      return localStorage.getItem('app_maintenance') === 'true';
    }
    return data.value === 'true' || data.value === true;
  } catch {
    return localStorage.getItem('app_maintenance') === 'true';
  }
}

export async function setMaintenanceStatus(enabled) {
  const val = enabled ? 'true' : 'false';
  localStorage.setItem('app_maintenance', val);

  try {
    // Try upsert to app_settings
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'maintenance', value: val }, { onConflict: 'key' });

    if (error) {
      console.warn('Could not save maintenance to DB, using localStorage:', error.message);
    }
  } catch {
    console.warn('Maintenance saved to localStorage only.');
  }
}
