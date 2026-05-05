import type { Settings } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';

/**
 * Mismo backend defensivo que `storage.ts` pero con su propia clave.
 * Refactorizar a futuro a un wrapper genérico si añadimos más entidades.
 */

const SETTINGS_KEY = '@blacklist/settings/v1';

interface Backend {
  getItem(k: string): Promise<string | null>;
  setItem(k: string, v: string): Promise<void>;
  removeItem(k: string): Promise<void>;
}

let backend: Backend | null = null;

function getBackend(): Backend {
  if (backend) return backend;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-async-storage/async-storage');
    const A = mod?.default ?? mod;
    if (!A?.getItem) throw new Error('async-storage inválido');
    backend = {
      getItem: (k) => A.getItem(k),
      setItem: (k, v) => A.setItem(k, v),
      removeItem: (k) => A.removeItem(k),
    };
  } catch {
    const map = new Map<string, string>();
    backend = {
      async getItem(k) { return map.get(k) ?? null; },
      async setItem(k, v) { map.set(k, v); },
      async removeItem(k) { map.delete(k); },
    };
  }
  return backend;
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await getBackend().getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    // Merge sobre defaults garantiza forward-compat al añadir campos nuevos.
    return { ...DEFAULT_SETTINGS, ...parsed } as Settings;
  } catch (err) {
    console.warn('[Blacklist] Error leyendo settings:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  try {
    await getBackend().setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch (err) {
    console.warn('[Blacklist] Error guardando settings:', err);
  }
}
