/**
 * Catálogo de divisas soportadas en la app.
 *
 * Selección: 2 más usadas por continente (12 en total).
 * Cuando el usuario quiera más, basta con añadir aquí.
 *
 * Se agrupan para que el selector tenga secciones legibles.
 */

export type Continent =
  | 'Norteamérica'
  | 'Sudamérica'
  | 'Europa'
  | 'Asia'
  | 'África'
  | 'Oceanía';

export interface CurrencyDef {
  /** ISO 4217. */
  code: string;
  /** Nombre humano en español. */
  name: string;
  /** Símbolo para mostrar (compacto). */
  symbol: string;
  /** Bandera emoji (decorativa, ignorada por accesibilidad). */
  flag: string;
  continent: Continent;
}

export const CURRENCIES: ReadonlyArray<CurrencyDef> = [
  // Norteamérica
  { code: 'USD', name: 'Dólar estadounidense', symbol: '$',  flag: '🇺🇸', continent: 'Norteamérica' },
  { code: 'MXN', name: 'Peso mexicano',         symbol: '$',  flag: '🇲🇽', continent: 'Norteamérica' },

  // Sudamérica
  { code: 'BRL', name: 'Real brasileño',        symbol: 'R$', flag: '🇧🇷', continent: 'Sudamérica' },
  { code: 'ARS', name: 'Peso argentino',        symbol: '$',  flag: '🇦🇷', continent: 'Sudamérica' },

  // Europa
  { code: 'EUR', name: 'Euro',                  symbol: '€',  flag: '🇪🇺', continent: 'Europa' },
  { code: 'GBP', name: 'Libra esterlina',       symbol: '£',  flag: '🇬🇧', continent: 'Europa' },

  // Asia
  { code: 'CNY', name: 'Yuan chino',            symbol: '¥',  flag: '🇨🇳', continent: 'Asia' },
  { code: 'JPY', name: 'Yen japonés',           symbol: '¥',  flag: '🇯🇵', continent: 'Asia' },

  // África
  { code: 'ZAR', name: 'Rand sudafricano',      symbol: 'R',  flag: '🇿🇦', continent: 'África' },
  { code: 'NGN', name: 'Naira nigeriana',       symbol: '₦',  flag: '🇳🇬', continent: 'África' },

  // Oceanía
  { code: 'AUD', name: 'Dólar australiano',     symbol: 'A$', flag: '🇦🇺', continent: 'Oceanía' },
  { code: 'NZD', name: 'Dólar neozelandés',     symbol: 'NZ$', flag: '🇳🇿', continent: 'Oceanía' },
];

const BY_CODE = new Map(CURRENCIES.map(c => [c.code, c] as const));

export function getCurrency(code: string): CurrencyDef {
  return BY_CODE.get(code) ?? CURRENCIES[0];
}

/** Agrupa para el selector (orden estable). */
export function groupedByContinent(): { continent: Continent; items: CurrencyDef[] }[] {
  const order: Continent[] = ['Norteamérica', 'Sudamérica', 'Europa', 'Asia', 'África', 'Oceanía'];
  return order.map(c => ({
    continent: c,
    items: CURRENCIES.filter(x => x.continent === c),
  }));
}
