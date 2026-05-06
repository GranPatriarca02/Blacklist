import { Platform } from 'react-native';
import type { Debt } from '@/types/debt';
import type { Settings } from '@/types/settings';
import { formatCurrency, formatElapsed } from './format';
import { pickDebtFreeMessage } from './messages';

/**
 * Wrapper sobre `expo-notifications` con import diferido y try/catch
 * a prueba de balas. Si la lib nativa no está enlazada o el dispositivo no
 * la soporta, las funciones devuelven `null`/`false` en vez de crashear.
 *
 * ─── Por qué llegaban tarde las notificaciones (fix May 2026) ────────────
 *
 * Android agrupa notificaciones de canales con importancia DEFAULT o LOW
 * para ahorrar batería (Doze + App Standby). Resultado: la notif se programa
 * a las 9:00 pero llega a las 9:25, 10:00 o más tarde.
 *
 * Soluciones aplicadas:
 *  1. `setNotificationChannelAsync('reminders', { importance: HIGH, … })`
 *     — canal explícito de alta importancia.
 *  2. `priority: 'high'` en el content (refuerzo).
 *  3. Trigger usa la constante `SchedulableTriggerInputTypes.DAILY` cuando
 *     está disponible (más fiable que el string 'daily' en algunas versiones).
 *  4. `SCHEDULE_EXACT_ALARM` ya está pedido en android.permissions del manifest.
 *
 * El usuario debe además tener la app fuera del modo de optimización de
 * batería del fabricante (Xiaomi/Huawei son los peores). Lo documentamos
 * en pantalla de ajustes.
 */

const CHANNEL_ID = 'reminders';

let notifModule: any = null;
let probed = false;
let channelReady = false;

/** Lazy-load de expo-notifications. Devuelve null si no está disponible. */
function getNotif(): any | null {
  if (probed) return notifModule;
  probed = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    notifModule = require('expo-notifications');
    if (notifModule?.setNotificationHandler) {
      // shouldShowAlert: false → no salta la notificación si la app está abierta.
      // Las notificaciones son recordatorios, no alertas en vivo.
      notifModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    }
    // Crear canal Android de alta importancia (idempotente)
    void ensureAndroidChannel();
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

/**
 * Crea el canal Android de alta importancia. Solo se ejecuta una vez por
 * sesión. Es idempotente del lado nativo (Android no recrea si ya existe).
 */
async function ensureAndroidChannel(): Promise<void> {
  if (channelReady) return;
  if (Platform.OS !== 'android') {
    channelReady = true;
    return;
  }
  const N = notifModule;
  if (!N?.setNotificationChannelAsync) return;
  try {
    await N.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Recordatorios de deudas',
      description: 'Avisos diarios sobre tus deudas pendientes y resumen del total',
      importance: N.AndroidImportance?.HIGH ?? 4,  // HIGH = 4
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFFFFF',
      lockscreenVisibility: N.AndroidNotificationVisibility?.PUBLIC ?? 1,
      bypassDnd: false,
      enableLights: true,
      enableVibrate: true,
      showBadge: false,
    });
    channelReady = true;
  } catch (err) {
    console.warn('[Blacklist] No se pudo crear el canal Android:', err);
  }
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

/**
 * Programa una notificación diaria que se repite a la hora elegida.
 *
 * Usa la constante `SchedulableTriggerInputTypes.DAILY` cuando está
 * disponible (más fiable). El canal Android se referencia para garantizar
 * importancia HIGH y evitar el batching de Doze.
 */
export async function scheduleDaily(args: ScheduleArgs): Promise<string | null> {
  const N = getNotif();
  if (!N) return null;
  const ok = await ensurePermissions();
  if (!ok) return null;
  await ensureAndroidChannel();

  // Tipo del trigger: usa la enumeración cuando esté expuesta, fallback a string.
  const triggerType: any =
    N.SchedulableTriggerInputTypes?.DAILY ?? 'daily';

  try {
    const id: string = await N.scheduleNotificationAsync({
      content: {
        title: args.title,
        body: args.body,
        data: args.data ?? {},
        priority: N.AndroidNotificationPriority?.HIGH ?? 'high',
        sound: 'default',
        // Android: canal explícito; iOS lo ignora.
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: {
        type: triggerType,
        hour: args.hour,
        minute: args.minute,
        // Algunas versiones de Expo aceptan channelId también en el trigger.
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
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
  // Para grupales, mostrar progreso
  if (debt.kind === 'group' && debt.members) {
    const paid = debt.members.filter(m => m.paidAt).length;
    const total = debt.members.length;
    return `${debt.debtorName}: ${amount}. ${paid}/${total} ya pagaron.`;
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
  const total = pending.reduce((acc, d) => acc + outstandingForDebt(d), 0);
  const displayCurrency = currency || pending[0].currency;
  const totalStr = formatCurrency(total, displayCurrency);
  const peopleStr = `${pending.length} ${pending.length === 1 ? 'deuda pendiente' : 'deudas pendientes'}`;
  return {
    title: 'Blacklist 💀$',
    body: `Te deben ${totalStr}. ${peopleStr}.`,
  };
}

/** Saldo pendiente de una deuda — para grupales, suma solo lo no pagado. */
function outstandingForDebt(debt: Debt): number {
  if (debt.kind === 'group' && debt.members) {
    return debt.members.reduce(
      (acc, m) => (m.paidAt ? acc : acc + m.amount),
      0,
    );
  }
  return debt.amount;
}

/**
 * Re-programa la notificación de UNA deuda según su configuración.
 * Devuelve el nuevo notificationId (o null si está apagada / falló).
 */
export async function syncDebtNotification(debt: Debt): Promise<string | null> {
  await cancelScheduled(debt.notificationId);
  if (!debt.notificationsEnabled) return null;
  if (debt.cyclePaidAt) return null;
  return scheduleDaily({
    title: 'Blacklist 💀$',
    body: bodyForDebt(debt),
    hour: debt.notifyHour,
    minute: debt.notifyMinute,
    data: { debtId: debt.id },
  });
}

/**
 * Re-programa la notificación del total.
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

/**
 * Suscribe un handler para cuando el usuario toca una notificación.
 *
 * Maneja DOS casos:
 *  1. App en primer plano / segundo plano: el listener `addNotificationResponseReceivedListener`
 *     se dispara al tocar la notif.
 *  2. Cold start (la app estaba cerrada y se abrió tocando la notif):
 *     `getLastNotificationResponseAsync()` devuelve la última respuesta pendiente.
 *
 * El callback recibe el `data` de la notificación. Para Blacklist:
 *   - `{ debtId: string }` → abre el detalle de esa deuda
 *   - `{ kind: 'total' }`  → abre la pantalla total
 *
 * Devuelve una función `unsubscribe` para limpiar.
 */
export function setupNotificationResponseHandler(
  onResponse: (data: Record<string, unknown>) => void,
): () => void {
  const N = getNotif();
  if (!N) return () => {};

  // Cold start: la app se acaba de abrir tocando una notificación.
  // Diferimos un poco para que la navegación esté lista (Stack montado).
  N.getLastNotificationResponseAsync?.()
    .then((r: any) => {
      const data = r?.notification?.request?.content?.data;
      if (data) {
        setTimeout(() => onResponse(data), 400);
      }
    })
    .catch(() => { /* ignorable */ });

  // Live: app abierta o en background.
  const sub = N.addNotificationResponseReceivedListener?.((r: any) => {
    const data = r?.notification?.request?.content?.data;
    if (data) onResponse(data);
  });

  return () => {
    try { sub?.remove?.(); } catch { /* ignorable */ }
  };
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
