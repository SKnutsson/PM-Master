import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Delar av appen används av flera personer samtidigt. Den här hooken lyssnar på
 * INSERT/UPDATE/DELETE i angivna tabeller och kallar `onChange` (debouncad).
 *
 * - Uppdateringen skjuts upp så länge användaren skriver i ett fält, så att
 *   osparade ändringar aldrig skrivs över av inkommande data.
 * - Kanalen stängs alltid när komponenten avmonteras.
 */
export function isUserTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable === true;
}

const DEBOUNCE_MS = 800;
const BUSY_RETRY_MS = 2000;

export function useRealtimeSync(
  channelName: string,
  tables: string[],
  onChange: () => void,
  enabled = true,
) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const tableKey = tables.join(',');

  useEffect(() => {
    if (!enabled || tables.length === 0) return;

    let timer: number | undefined;
    let stopped = false;

    const run = () => {
      if (stopped) return;
      if (isUserTyping() || document.hidden) {
        timer = window.setTimeout(run, BUSY_RETRY_MS);
        return;
      }
      cb.current();
    };

    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(run, DEBOUNCE_MS);
    };

    const channel = supabase.channel(`${channelName}-${Math.random().toString(36).slice(2)}`);
    tableKey.split(',').forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, schedule);
    });
    channel.subscribe();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, channelName, tableKey]);
}
