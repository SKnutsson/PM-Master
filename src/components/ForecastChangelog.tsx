import { useEffect, useState } from 'react';
import { History, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ChangeRow {
  id: string;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  details: string | null;
  changed_by: string | null;
  created_at: string;
}

const typeLabel: Record<string, string> = {
  created: 'Affär skapad',
  status_change: 'Status ändrad',
  month_moved: 'Flyttad månad',
  field_change: 'Uppgift ändrad',
  amount_change: 'Belopp ändrat',
  amount_added: 'Belopp tillagt',
  amount_removed: 'Belopp borttaget',
  deleted: 'Affär raderad',
};

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export function ForecastChangelog({ forecastId }: { forecastId: string }) {
  const [rows, setRows] = useState<ChangeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from('forecast_events')
      .select('id, event_type, old_value, new_value, details, changed_by, created_at')
      .eq('forecast_id', forecastId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!active) return;
        setRows((data || []) as ChangeRow[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [forecastId]);

  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-2 mb-2">
        <History className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold">Ändringslogg</span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Hämtar historik…
        </div>
      )}

      {!loading && rows.length === 0 && (
        <p className="text-xs text-muted-foreground py-1">Inga ändringar registrerade ännu.</p>
      )}

      {!loading && rows.length > 0 && (
        <ul className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {rows.map((r) => (
            <li key={r.id} className="text-xs leading-snug border-l-2 border-primary/40 pl-2">
              <div className="font-medium">
                {typeLabel[r.event_type] || r.event_type}
                {r.details && <span className="text-muted-foreground"> · {r.details}</span>}
              </div>
              {(r.old_value || r.new_value) && (
                <div className="text-muted-foreground">
                  {r.old_value && <span className="line-through">{r.old_value}</span>}
                  {r.old_value && r.new_value && <span> → </span>}
                  {r.new_value && <span className="text-foreground">{r.new_value}</span>}
                </div>
              )}
              <div className="text-[11px] text-muted-foreground">
                {r.changed_by || 'Okänd'} · {formatWhen(r.created_at)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
