import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Debt } from '@/types/debt';

/**
 * Persistencia local en AsyncStorage.
 *
 * - Una sola key (`STORAGE_KEY`) con todo el array serializado.
 * - Con < 5000 deudas el coste de leer/escribir todo es trivial.
 * - Si en el futuro escala, migrar a expo-sqlite sin tocar la UI:
 *   solo hay que mantener la firma de `loadDebts`/`saveDebts`.
 */

const STORAGE_KEY = '@blacklist/debts/v1';

export async function loadDebts(): Promise<Debt[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Debt[];
  } catch (err) {
    console.warn('[Blacklist] Error leyendo deudas:', err);
    return [];
  }
}

export async function saveDebts(debts: Debt[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(debts));
  } catch (err) {
    console.warn('[Blacklist] Error guardando deudas:', err);
  }
}

export async function clearDebts(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
