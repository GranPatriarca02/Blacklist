/**
 * Ajustes globales de la app.
 *
 * Diseño simple: un único objeto plano persistido como JSON.
 * Si en el futuro crece, podemos secciónarlo (`settings.notifications.*`).
 */
export interface Settings {
  /** Divisa por defecto al crear deudas. ISO 4217. */
  currency: string;

  // ─── Notificación del total ───────────────────────────────────────────
  /** Si está activa la notificación diaria con el total adeudado. */
  totalNotificationsEnabled: boolean;
  /** Hora local diaria (0-23). */
  totalNotifyHour: number;
  /** Minuto local diario (0-59). */
  totalNotifyMinute: number;
  /** Id Expo de la notificación programada del total. */
  totalNotificationId?: string;
}

export const DEFAULT_SETTINGS: Settings = {
  currency: 'USD',
  totalNotificationsEnabled: false,
  totalNotifyHour: 9,
  totalNotifyMinute: 0,
};
