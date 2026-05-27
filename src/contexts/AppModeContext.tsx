import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type AppMode = 'pm' | 'crm';

interface AppModeCtx {
  mode: AppMode;
  setMode: (m: AppMode) => void;
}

const Ctx = createContext<AppModeCtx | undefined>(undefined);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => {
    if (typeof window === 'undefined') return 'pm';
    return (localStorage.getItem('app_mode') as AppMode) || 'pm';
  });

  useEffect(() => {
    localStorage.setItem('app_mode', mode);
  }, [mode]);

  return <Ctx.Provider value={{ mode, setMode: setModeState }}>{children}</Ctx.Provider>;
}

export function useAppMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppMode must be used within AppModeProvider');
  return ctx;
}
