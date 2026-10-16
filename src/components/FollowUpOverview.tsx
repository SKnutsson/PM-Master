import { useEffect, useMemo, useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Props {
  projects: { id: string; code?: string | null; name: string; customer?: string; projectManager?: string }[];
  estimations: { projectId: string; estimatedInstallHours: number; estimatedTravelHours: number }[];
  dailyEntries: { projectId: string; plannedWorkHours: number; plannedTravelHours: number }[];
  archiveMode: 'active' | 'archived';
  onOpen: (id: string) => void;
}

type KpiRow = { project_id: string; deviations: number | null; inspection_remarks: number | null; deviation_details: any; inspection_remark_details: any };

export function FollowUpOverview({ projects, estimations, dailyEntries, archiveMode, onOpen }: Props) {
  const [q, setQ] = useState('');
  const [kpi, setKpi] = useState<Record<string, KpiRow>>({});

  useEffect(() => {
    supabase.from('project_kpi_metrics').select('project_id, deviations, inspection_remarks, deviation_details, inspection_remark_details')
      .then(({ data }) => setKpi(Object.fromEntries((data || []).map((r: any) => [r.project_id, r]))));
  }, []);

  const rows = useMemo(() => projects
    .filter(p => !q || `${p.code ?? ''} ${p.name} ${p.customer ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .map(p => {
      const est = estimations.find(e => e.projectId === p.id);
      const kalkyl = (est?.estimatedInstallHours ?? 0) + (est?.estimatedTravelHours ?? 0);
      const utfall = dailyEntries.filter(e => e.projectId === p.id).reduce((s, e) => s + e.plannedWorkHours + e.plannedTravelHours, 0);
      const k = kpi[p.id];
      const dev = k?.deviations ?? (Array.isArray(k?.deviation_details) ? k!.deviation_details.length : 0);
      const rem = k?.inspection_remarks ?? (Array.isArray(k?.inspection_remark_details) ? k!.inspection_remark_details.length : 0);
      return { p, kalkyl, utfall, dev, rem };
    }), [projects, estimations, dailyEntries, kpi, q]);

  return (
    <div className="space-y-3">
      <div className="relative w-[260px]">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Sök projekt" className="h-9 pl-7 text-sm" />
      </div>
      <div className="reference-list">
        <table className="w-full text-sm">
          <thead>
            <tr className="list-heading text-left">
              <th className="px-3 py-2">Projekt</th>
              <th className="px-3 py-2">Kund</th>
              <th className="px-3 py-2 text-right">Kalkyl</th>
              <th className="px-3 py-2 text-right">Utfall</th>
              <th className="px-3 py-2 text-right">Diff</th>
              <th className="px-3 py-2 text-right">Avvikelser</th>
              <th className="px-3 py-2 text-right">Besiktn.anm.</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, kalkyl, utfall, dev, rem }) => {
              const diff = utfall - kalkyl;
              return (
                <tr key={p.id} onClick={() => onOpen(p.id)} className="list-record cursor-pointer hover:bg-muted/60">
                  <td className="px-3 py-2 font-medium">{p.code ? `${p.code} – ` : ''}{p.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.customer || '–'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{kalkyl ? `${kalkyl}h` : '–'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{utfall ? `${utfall}h` : '–'}</td>
                  <td className={cn('px-3 py-2 text-right tabular-nums', kalkyl && diff > 0 && 'text-status-delayed', kalkyl && diff < 0 && 'text-status-completed')}>
                    {kalkyl ? (diff > 0 ? `+${diff}h` : `${diff}h`) : '–'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{dev || '–'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{rem || '–'}</td>
                  <td className="px-2"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                {archiveMode === 'active' ? 'Inga pågående projekt' : 'Inga avslutade projekt'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
