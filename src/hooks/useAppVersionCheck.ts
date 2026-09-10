import { useEffect, useRef, useState } from 'react';

/**
 * Hämtar index.html i bakgrunden och jämför vilken app-bundle som serveras.
 * Skiljer den sig från den som körs returneras true, och appen visar en notis
 * där användaren själv väljer när sidan ska laddas om. Ingen automatisk reload
 * sker, så pågående formulärifyllning kan aldrig gå förlorad.
 */
const CHECK_INTERVAL_MS = 60 * 1000;

function currentBundle(): string | null {
  const el = document.querySelector<HTMLScriptElement>('script[type="module"][src]');
  return el?.getAttribute('src') ?? null;
}

async function latestBundle(): Promise<string | null> {
  try {
    const res = await fetch(`/index.html?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const html = await res.text();
    return html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1] ?? null;
  } catch {
    return null;
  }
}

export function useAppVersionCheck(enabled: boolean): boolean {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const found = useRef(false);

  useEffect(() => {
    if (!enabled || import.meta.env.DEV) return;

    // Rensa gamla service workers/caches så att ingen kör en inaktuell version.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations?.().then((regs) => {
        regs.forEach((r) => r.unregister());
      }).catch(() => undefined);
    }

    const check = async () => {
      if (found.current || document.hidden) return;
      const running = currentBundle();
      const latest = await latestBundle();
      if (running && latest && running !== latest) {
        found.current = true;
        setUpdateAvailable(true);
      }
    };

    check();
    const id = window.setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, [enabled]);

  return updateAvailable;
}
