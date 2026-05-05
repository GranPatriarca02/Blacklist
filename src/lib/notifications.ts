import type { Debt } from '@/types/debt';
import type { Settings } from '@/types/settings';
import { formatCurrency, formatElapsed } from './format';
import { pickDebtFreeMessage } from './messages';

/**
 * Wrapper sobre `expo-notifications` con import diferido y try/catch
 * a prueba de balas. Si la lib nativa no está enlazada o el dispositivo no
 * la soporta, las funciones devuelven `null`/`false` en vez de crashear.
 *
 * Estrategia de re-sincronización:
 *  - El cuerpo de la notificación es estático una vez programado.
 *  - Por eso re-sincronizamos al abrir la app y tras cada cambio relevante
 *    (DebtsContext + SettingsContext lo invocan).
 *  - Cancelamos siempre el id anterior antes de programar uno nuevo.
 */

let notifModule: any = null;
let probed = false;

/** Lazy-load de expo-notifications. Devuelve null si no está disponible. */
function getNotif(): any | null {
  if (probed) return notifModule;
  probed = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    notifModule = require('expo-notifications');
    // Configurar handler para que se muestre incluso con app en foreground
    if (notifModule?.setNotificationHandler) {
      notifModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    }
  } catch (err) {
    console.warn(
      '[Blacklist] expo-notifications no disponible. Las notificaciones se ' +
      'desactivan silenciosamente. Detalle:',
      err instanceof Error ? err.message : err,
    );
    notifModule = null;
  }
  return notifModule;
}

export function isAvailable(): boolean {
  return getNotif() !== null;
}

/** Pide permisos. Devuelve true si concedidos. */
export async function ensurePermissions(): Promise<boolean> {
  const N = getNotif();
  if (!N) return false;
  try {
    const current = await N.getPermissionsAsync();
    if (current?.granted) return true;
    if (current?.canAskAgain === false) return false;
    const req = await N.requestPermissionsAsync();
    return !!req?.granted;
  } catch (err) {
    console.warn('[Blacklist] ensurePermissions falló:', err);
    return false;
  }
}

/** Cancela una notificación programada por id. Idempotente. */
export async function cancelScheduled(id: string | undefined | null): Promise<void> {
  if (!id) return;
  const N = getNotif();
  if (!N) return;
  try {
    await N.cancelScheduledNotificationAsync(id);
  } catch {
    /* ignorable: la notif ya pudo no existir */
  }
}

interface ScheduleArgs {
  title: string;
  body: string;
  hour: number;
  minute: number;
  data?: Record<string, unknown>;
}

/** Programa una notificación diaria que se repite. */
export async function scheduleDaily(args: ScheduleArgs): Promise<string | null> {
  const N = getNotif();
  if (!N) return null;
  const ok = await ensurePermissions();
  if (!ok) return null;
  try {
    const id: string = await N.scheduleNotificationAsync({
      content: {
        title: args.title,
        body: args.body,
        data: args.data ?? {},
      },
      // Trigger diario nativo: la mejor batería + fiabilidad.
      trigger: {
        hour: args.hour,
        minute: args.minute,
        repeats: true,
        // En SDK 52 el campo "type" no es obligatorio para hour/minute.
      },
    });
    return id ?? null;
  } catch (err) {
    console.warn('[Blacklist] scheduleDaily falló:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  Helpers específicos del dominio
// ─────────────────────────────────────────────────────────────────────────

/** Construye el body de una deuda individual. */
export function bodyForDebt(debt: Debt, now: Date = new Date()): string {
  const amount = formatCurrency(debt.amount, debt.currency);
  if (debt.cyclePaidAt) {
    return `${debt.debtorName} ya pagó este ciclo. Próxima reapertura programada.`;
  }
  const elapsed = now.getTime() - new Date(debt.cycleStartedAt).getTime();
  return `${debt.debtorName} te debe ${amount}. Lleva ${formatElapsed(elapsed)} sin pagar.`;
}

/**
 * Construye el body de la notificación del total.
 * Usa settings.currency para mostrar el total en la divisa global actual.
 */
export function bodyForTotal(debts: Debt[], currency?: string): { title: string; body: string } {
  const pending = debts.filter(d => !d.cyclePaidAt);
  if (pending.length === 0) {
    return { title: 'Blacklist 💀$', body: pickDebtFreeMessage() };
  }
  const total = pending.reduce((acc, d) => acc + d.amount, 0);
  // Usa la divisa global (settings.currency) si se proporciona, sino la primera deuda
  const displayCurrency = currency || pending[0].currency;
  const totalStr = formatCurrency(total, displayCurrency);
  const peopleStr = `${pending.length} ${pending.length === 1 ? 'persona' : 'personas'}`;
  return {
    title: 'Blacklist 💀$',
    body: `Te deben ${totalStr}. ${peopleStr} pendientes.`,
  };
}

/**
 * Re-programa la notificación de UNA deuda según su configuración.
 * Devuelve el nuevo notificationId (o null si está apagada / falló).
 *
 * Siempre cancela el anterior primero.
 */
export async function syncDebtNotification(debt: Debt): Promise<string | null> {
  await cancelScheduled(debt.notificationId);
  if (!debt.notificationsEnabled) return null;
  if (debt.cyclePaidAt) return null; // si está pagada (esperando reapertura), no notificamos
  const { title } = { title: 'Blacklist 💀$' };
  return scheduleDaily({
    title,
    body: bodyForDebt(debt),
    hour: debt.notifyHour,
    minute: debt.notifyMinute,
    data: { debtId: debt.id },
  });
}

/**
 * Re-programa la notificación del total.
 * Devuelve el nuevo notificationId (o null).
 */
export async function syncTotalNotification(
  debts: Debt[],
  settings: Settings,
): Promise<string | null> {
  await cancelScheduled(settings.totalNotificationId);
  if (!settings.totalNotificationsEnabled) return null;
  const { title, body } = bodyForTotal(debts, settings.currency);
  return scheduleDaily({
    title,
    body,
    hour: settings.totalNotifyHour,
    minute: settings.totalNotifyMinute,
    data: { kind: 'total' },
  });
}

/** Cancela TODAS las notificaciones programadas (panic button). */
export async function cancelAll(): Promise<void> {
  const N = getNotif();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
  } catch {
    /* ignorable */
  }
}
