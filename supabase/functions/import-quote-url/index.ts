import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX_BYTES = 25 * 1024 * 1024;
const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Block requests to local/private networks so the function can't be used to probe internal services.
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true;
  if (/^(10|127|0)\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) return true;
  if (h.includes(':') && (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80') || h === '::')) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Inte inloggad' }, 401);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: userData, error: userError } = await supabase.auth.getUser(auth.replace('Bearer ', ''));
    if (userError || !userData.user) return json({ error: 'Inte inloggad' }, 401);
    const { data: allowed } = await supabase.rpc('can_access_crm', { _user_id: userData.user.id });
    if (!allowed) return json({ error: 'Saknar behörighet' }, 403);

    const body = await req.json().catch(() => null);
    const raw = typeof body?.url === 'string' ? body.url.trim() : '';
    if (!raw || raw.length > 2048) return json({ error: 'Ogiltig länk' }, 400);
    let url: URL;
    try { url = new URL(raw); } catch { return json({ error: 'Ogiltig länk' }, 400); }
    if (!['http:', 'https:'].includes(url.protocol) || isBlockedHost(url.hostname)) return json({ error: 'Länken är inte tillåten' }, 400);

    let current = url;
    let res: Response | null = null;
    for (let i = 0; i < 5; i++) {
      res = await fetch(current, { redirect: 'manual', headers: { 'User-Agent': 'PM-Master-Import/1.0', Accept: 'application/pdf,*/*' } });
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        current = new URL(res.headers.get('location')!, current);
        if (!['http:', 'https:'].includes(current.protocol) || isBlockedHost(current.hostname)) return json({ error: 'Länken är inte tillåten' }, 400);
        continue;
      }
      break;
    }
    if (!res || !res.ok) return json({ error: `Kunde inte hämta filen (${res?.status ?? 'okänt fel'}). Kräver det gamla systemet inloggning?` }, 502);
    const declared = Number(res.headers.get('content-length') || 0);
    if (declared > MAX_BYTES) return json({ error: 'Filen är större än 25 MB' }, 413);
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) return json({ error: 'Filen är större än 25 MB' }, 413);
    const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
    if (!isPdf) return json({ error: 'Länken pekar inte på en PDF (kanske en inloggningssida)' }, 415);

    return new Response(bytes, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/pdf' } });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Okänt fel' }, 500);
  }
});
