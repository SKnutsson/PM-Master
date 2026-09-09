import { useEffect, useRef } from 'react';

/**
 * Hämtar index.html i bakgrunden och jämför vilken app-bundle som serveras.
 * Skiljer den sig från den som körs laddas sidan om automatiskt, så att
 * användaren alltid får senaste versionen utan att behöva refresha manuellt.
 */
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

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

export function useAppVersionCheck(enabled: boolean) {
  const reloaded = useRef(false);

  useEffect(() => {
    if (!enabled || import.meta.env.DEV) return;

    const check = async () => {
      if (reloaded.current || document.hidden) return;
      const running = currentBundle();
      const latest = await latestBundle();
      if (running && latest && running !== latest) {
        reloaded.current = true;
        window.location.reload();
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
}
