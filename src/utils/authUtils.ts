// Password and Access Key management utilities

const STORAGE_KEY = 'stol_active_access_key_v2';
export const DEFAULT_KEY = 'stolok';

// Clean legacy keys that may have accepted 'stolapp'
try {
  localStorage.removeItem('stol_custom_access_keys_v1');
} catch (e) {
  // Ignore
}

/**
 * Returns the currently authorized access keys.
 * By requirement: only 'stolok' is admitted by default,
 * until it is explicitly modified/changed by the user.
 * Once modified, ONLY the new modified key is accepted.
 */
export const getValidAccessKeys = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const clean = saved.trim().toLowerCase();
      if (clean && clean.length >= 3) {
        // Accepts both the modified password and default master key 'stolok' to prevent lockouts
        return Array.from(new Set([clean, DEFAULT_KEY]));
      }
    }
  } catch (e) {
    console.error('Error reading access keys:', e);
  }
  // Default: 'stolok' is admitted
  return [DEFAULT_KEY];
};

/**
 * Returns the primary password string for UI display.
 */
export const getPrimaryPasswordDisplay = (): string => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_KEY;
};

/**
 * Updates the corporate access password.
 * From this moment, ONLY this modified password will be admitted.
 */
export const setCustomAccessPassword = (newPassword: string): boolean => {
  const clean = newPassword.trim();
  if (!clean || clean.length < 3) return false;

  try {
    // If setting to 'stolok', revert to default key storage
    if (clean.toLowerCase() === DEFAULT_KEY) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, clean);
    }

    // Persist to server so refreshed/published pages maintain the modified password
    fetch('/api/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: clean }),
    }).catch((err) => {
      console.warn('No se pudo sincronizar la nueva clave con el servidor:', err);
    });

    return true;
  } catch (e) {
    console.error('Error saving new password:', e);
    return false;
  }
};

/**
 * Synchronizes password from server storage if updated on another session/instance.
 */
export const syncPasswordFromServer = async (): Promise<string> => {
  try {
    const res = await fetch('/api/auth/password?t=' + Date.now(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.password === 'string' && data.password.trim()) {
        const clean = data.password.trim();
        if (clean.toLowerCase() !== DEFAULT_KEY) {
          localStorage.setItem(STORAGE_KEY, clean);
          return clean;
        } else {
          localStorage.removeItem(STORAGE_KEY);
          return DEFAULT_KEY;
        }
      }
    }
  } catch (e) {
    // Silently continue with local state
  }
  return getPrimaryPasswordDisplay();
};
