import type { Debt } from '@/types/debt';

/**
 * Persistencia local de deudas.
 *
 * Estrategia defensiva:
 *  - Importamos AsyncStorage de forma diferida (lazy) y dentro de un try/catch.
 *    Si el módulo nativo no está enlazado (p. ej. usaste el APK antiguo
 *    después de añadir la dependencia sin rebuild), caemos a un store
 *    en memoria. La app sigue corriendo; solo pierde persistencia entre cierres.
 *  - Cuando el módulo nativo está disponible, se comporta normal y guarda en disco.
 *
 * Para volver a habilitar la persistencia tras añadir la dep:
 *   npx expo prebuild --clean && npm run android
 */

const STORAGE_KEY = '@blacklist/debts/v1';

// ---- Backend abstracto -----------------------------------------------------

interface StorageBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  readonly kind: 'async-storage' | 'memory';
}

let backendCache: StorageBackend | null = null;

function memoryBackend(): StorageBackend {
  const map = new Map<string, string>();
  return {
    kind: 'memory',
    async getItem(k) { return map.has(k) ? map.get(k)! : null; },
    async setItem(k, v) { map.set(k, v); },
    async removeItem(k) { map.delete(k); },
  };
}

function getBackend(): StorageBackend {
  if (backendCache) return backendCache;
  try {
    // Lazy require: si el módulo no existe, cae al catch sin tirar la app.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-async-storage/async-storage');
    const AsyncStorage = mod?.default ?? mod;
    if (!AsyncStorage || typeof AsyncStorage.getItem !== 'function') {
      throw new Error('AsyncStorage default export invalido');
    }
    backendCache = {
      kind: 'async-storage',
      getItem: (k) => AsyncStorage.getItem(k),
      setItem: (k, v) => AsyncStorage.setItem(k, v),
      removeItem: (k) => AsyncStorage.removeItem(k),
    };
  } catch (err) {
    console.warn(
      '[Blacklist] AsyncStorage no disponible (falta rebuild nativo?). ' +
      'Usando memoria temporal. Detalle:',
      err instanceof Error ? err.message : err,
    );
    backendCache = memoryBackend();
  }
  return backendCache;
}

/** Util para diagnosticos en pantalla. */
export function getStorageKind(): 'async-storage' | 'memory' {
  return getBackend().kind;
}

// ---- API publica -----------------------------------------------------------

export async function loadDebts(): Promise<Debt[]> {
  try {
    const raw = await getBackend().getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Debt[]) : [];
  } catch (err) {
    console.warn('[Blacklist] Error leyendo deudas:', err);
    return [];
  }
}

export async function saveDebts(debts: Debt[]): Promise<void> {
  try {
    await getBackend().setItem(STORAGE_KEY, JSON.stringify(debts));
  } catch (err) {
    console.warn('[Blacklist] Error guardando deudas:', err);
  }
}

export async function clearDebts(): Promise<void> {
  try {
    await getBackend().removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[Blacklist] Error limpiando deudas:', err);
  }
}
