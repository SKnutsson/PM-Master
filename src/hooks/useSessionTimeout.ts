import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/** Policy: 60 min inaktivitet, 12 h absolut maximal sessionstid. */
export const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
export const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000;
const WARNING_BEFORE_MS = 2 * 60 * 1000;

const LAST_ACTIVITY_KEY = 'pm.session.lastActivity';
const SESSION_START_KEY = 'pm.session.startedAt';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'wheel', 'touchstart', 'scroll', 'pointerdown'] as const;

function now() {
  return Date.now();
}

export function markSessionStart() {
  localStorage.setItem(SESSION_START_KEY, String(now()));
  localStorage.setItem(LAST_ACTIVITY_KEY, String(now()));
}

export function clearSessionMarkers() {
  localStorage.removeItem(SESSION_START_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

interface Options {
  enabled: boolean;
  onExpire: (reason: 'idle' | 'absolute') => void;
}

/**
 * Säker sessionshantering:
 * - Automatisk utloggning efter 60 min inaktivitet (aktivitet förlänger sessionen).
 * - Absolut maxtid 12 h från inloggning, därefter krävs ny inloggning.
 * Tiderna delas mellan flikar via localStorage.
 */
export function useSessionTimeout({ enabled, onExpire }: Options) {
  const warnedRef = useRef(false);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      warnedRef.current = false;
      expiredRef.current = false;
      return;
    }

    if (!localStorage.getItem(SESSION_START_KEY)) markSessionStart();

    const touch = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now()));
      warnedRef.current = false;
    };

    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, touch, { passive: true })
    );

    const interval = window.setInterval(() => {
      if (expiredRef.current) return;
      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || now();
      const started = Number(localStorage.getItem(SESSION_START_KEY)) || now();
      const idleFor = now() - last;
      const sessionAge = now() - started;

      if (sessionAge >= ABSOLUTE_TIMEOUT_MS) {
        expiredRef.current = true;
        onExpire('absolute');
        return;
      }
      if (idleFor >= IDLE_TIMEOUT_MS) {
        expiredRef.current = true;
        onExpire('idle');
        return;
      }
      if (!warnedRef.current && IDLE_TIMEOUT_MS - idleFor <= WARNING_BEFORE_MS) {
        warnedRef.current = true;
        toast.warning('Du loggas ut om 2 minuter på grund av inaktivitet', {
          description: 'Klicka eller rör musen för att förbli inloggad.',
          duration: 30000,
        });
      }
    }, 15000);

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, touch));
      window.clearInterval(interval);
    };
  }, [enabled, onExpire]);
}
