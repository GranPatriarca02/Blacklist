import { useEffect, useState } from 'react';

/**
 * Devuelve los milisegundos transcurridos desde `fromIso` hasta ahora,
 * actualizándose cada `tickMs`.
 *
 * - Si `fromIso` es null/undefined o se pasa `enabled=false`, no programa
 *   intervalos (no consume batería innecesariamente).
 * - Cada DebtCard usa su propio hook → la lista nunca re-renderiza completa,
 *   solo el componente que está mostrando el contador.
 */
export function useElapsed(
  fromIso: string | null | undefined,
  enabled: boolean = true,
  tickMs: number = 1000,
): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !fromIso) return;
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [enabled, fromIso, tickMs]);

  if (!fromIso) return 0;
  return Math.max(0, now - new Date(fromIso).getTime());
}
