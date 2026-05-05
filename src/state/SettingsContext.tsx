import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Settings } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { loadSettings, saveSettings } from '@/lib/settingsStorage';

interface SettingsContextValue {
  loaded: boolean;
  settings: Settings;
  /** Actualiza parcialmente y persiste. */
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const isFirst = useRef(true);

  useEffect(() => {
    let on = true;
    loadSettings().then(s => {
      if (!on) return;
      setSettings(s);
      setLoaded(true);
    });
    return () => { on = false; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    saveSettings(settings);
  }, [loaded, settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo(
    () => ({ loaded, settings, update }),
    [loaded, settings, update],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings() debe usarse dentro de <SettingsProvider>');
  return ctx;
}
