import { useEffect, useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { FileDown, Archive, Plus, Trash2, CircleCheck, CircleAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type CloseoutData = {
  checks: Record<string, boolean>;
  notes: Record<string, string>;
};

export const CLOSEOUT_SECTIONS: { key: string; title: string; items: { key: string; label: string }[] }[] = [
  { key: 'deviations', title: '1. Avvikelser', items: [
    { key: 'dev_logged', label: 'Alla avvikelser är registrerade i Uppföljning' },
  ]},
  { key: 'remarks', title: '2. Besiktningsanmärkningar', items: [
    { key: 'remarks_closed', label: 'Besiktningsanmärkningar åtgärdade' },
  ]},
  { key: 'lessons', title: '3. Erfarenhetsåterföring', items: [
    { key: 'lessons_meeting', label: 'Erfarenhetsmöte genomfört' },
  ]},
];

type Kpi = { deviations: { type: string; description: string }[]; remarks: string[]; missing: string[]; ftr: string[]; notes: string };
const emptyKpi: Kpi = { deviations: [], remarks: [], missing: [], ftr: [], notes: '' };

const empty: CloseoutData = { checks: {}, notes: {} };

export function ProjectCloseoutView() {
  const { projects, updateProject } = useProjectDataContext();
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<string>('');
  const [data, setData] = useState<CloseoutData>(empty);
  const [signed, setSigned] = useState<{ signed_off: boolean; signed_by_name: string | null; signed_at: string | null }>({ signed_off: false, signed_by_name: null, signed_at: null });
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<number>();
  const project = projects.find(p => p.id === projectId) || null;

  const [kpi, setKpi] = useState<Kpi>(emptyKpi);
  useEffect(() => {
    if (!projectId) return;
    setLoaded(false);
    supabase.from('project_kpi_metrics').select('*').eq('project_id', projectId).maybeSingle().then(({ data: k }) => {
      const arr = (v: any) => (Array.isArray(v) ? v : []);
      setKpi(k ? {
        deviations: arr(k.deviation_details).map((i: any) => typeof i === 'string' ? { type: 'Övrigt', description: i } : { type: i?.type || 'Övrigt', description: i?.description || '' }),
        remarks: arr(k.inspection_remark_details).map(String),
        missing: arr(k.missing_article_details).map(String),
        ftr: arr(k.ftr_details).map(String),
        notes: k.notes ?? '',
      } : emptyKpi);
    });
    supabase.from('project_closeouts').select('*').eq('project_id', projectId).maybeSingle().then(({ data: row }) => {
      setData(row ? { ...empty, ...(row.data as any) } : empty);
      setSigned({ signed_off: row?.signed_off ?? false, signed_by_name: row?.signed_by_name ?? null, signed_at: row?.signed_at ?? null });
      setLoaded(true);
    });
  }, [projectId]);

  const persist = (next: CloseoutData, extra: Record<string, any> = {}) => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const { error } = await supabase.from('project_closeouts').upsert({ project_id: projectId, data: next as any, ...extra }, { onConflict: 'project_id' });
      if (error) toast({ title: 'Kunde inte spara', description: error.message, variant: 'destructive' });
    }, 500);
  };
  const update = (fn: (d: CloseoutData) => CloseoutData) => setData(prev => { const n = fn(prev); persist(n); return n; });

  const allItems = CLOSEOUT_SECTIONS.flatMap(s => s.items);
  const done = allItems.filter(i => data.checks[i.key]).length;
  const percent = Math.round((done / allItems.length) * 100);
  const ready = done === allItems.length;

  const signOff = async (value: boolean) => {
    const name = user?.email ?? 'Okänd';
    const extra = value ? { signed_off: true, signed_by_name: name, signed_at: new Date().toISOString() } : { signed_off: false, signed_by_name: null, signed_at: null };
    const { error } = await supabase.from('project_closeouts').upsert({ project_id: projectId, data: data as any, ...extra }, { onConflict: 'project_id' });
    if (error) return toast({ title: 'Fel', description: error.message, variant: 'destructive' });
    setSigned(extra as any);
  };

  const archive = async () => {
    if (!project) return;
    await updateProject(project.id, { status: 'Avslutat' } as any);
    toast({ title: 'Projektet arkiverat' });
  };

  const exportPdf = () => {
    if (!project) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFillColor(24, 50, 58); doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.text('PROJEKTAVSLUT – SLUTRAPPORT', 14, 12);
    doc.setFontSize(10); doc.text(`${project.code ?? ''} ${project.name} · ${project.customer}`, 14, 20);
    doc.setTextColor(0, 0, 0);
    let y = 32;
    for (const s of CLOSEOUT_SECTIONS) {
      autoTable(doc, {
        startY: y, head: [[s.title, 'Status']],
        body: [...s.items.map(i => [i.label, data.checks[i.key] ? 'Klar' : 'Ej klar']), ...(data.notes[s.key] ? [[`Kommentar: ${data.notes[s.key]}`, '']] : [])],
        headStyles: { fillColor: [28, 127, 114] }, styles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
      const list = s.key === 'deviations'
        ? { head: ['Avvikelse', 'Typ'], body: kpi.deviations.map(d => [d.description || '–', d.type]) }
        : s.key === 'remarks'
        ? { head: ['Besiktningsanmärkning', ''], body: kpi.remarks.map(r => [r || '–', '']) }
        : null;
      if (list && list.body.length) {
        autoTable(doc, { startY: y, head: [list.head], body: list.body, headStyles: { fillColor: [24, 50, 58] }, styles: { fontSize: 9 } });
        y = (doc as any).lastAutoTable.finalY + 4;
      }
    }
    if (kpi.missing.length) { autoTable(doc, { startY: y, head: [['Saknade artiklar']], body: kpi.missing.map(m => [m || '–']), headStyles: { fillColor: [24, 50, 58] }, styles: { fontSize: 9 } }); y = (doc as any).lastAutoTable.finalY + 4; }
    if (kpi.notes) { autoTable(doc, { startY: y, head: [['Noteringar från uppföljning']], body: [[kpi.notes]], headStyles: { fillColor: [24, 50, 58] }, styles: { fontSize: 9 } }); y = (doc as any).lastAutoTable.finalY + 4; }
    autoTable(doc, { startY: y, head: [['Sign-off', '']], body: [['Status', signed.signed_off ? `Signerad av ${signed.signed_by_name} ${signed.signed_at?.slice(0, 10)}` : 'Ej signerad']], headStyles: { fillColor: [28, 127, 114] }, styles: { fontSize: 9 } });
    doc.save(`Projektavslut_${project.code ?? project.name}.pdf`);
  };

  const sorted = useMemo(() => [...projects].sort((a, b) => (a.code ?? '').localeCompare(b.code ?? '', 'sv', { numeric: true })), [projects]);

  const [active, setActive] = useState('deviations');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const keys = [...CLOSEOUT_SECTIONS.map(s => s.key), 'signoff'];
    const onScroll = () => {
      let cur = keys[0];
      for (const k of keys) {
        const n = document.getElementById(`co-${k}`);
        if (n && n.getBoundingClientRect().top - el.getBoundingClientRect().top <= 96) cur = k;
      }
      setActive(cur);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [loaded, projectId]);
  const goTo = (k: string) => document.getElementById(`co-${k}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="flex h-full flex-col">
    <div className="list-page px-6 pt-6 pb-3 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Projektavslut</h1>
          <p className="text-sm text-muted-foreground uppercase">Avvikelser, besiktning, erfarenheter och sign-off</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Välj projekt" /></SelectTrigger>
            <SelectContent>
              {sorted.map(p => <SelectItem key={p.id} value={p.id}>{p.code ? `${p.code} – ` : ''}{p.name}{p.status === 'Avslutat' ? ' (arkiverat)' : ''}</SelectItem>)}
            </SelectContent>
          </Select>
          {project && <Button variant="outline" size="sm" className="gap-2" onClick={exportPdf}><FileDown className="h-4 w-4" />Slutrapport PDF</Button>}
        </div>
      </div>

      {!project && <p className="text-sm text-muted-foreground">Välj ett projekt för att starta projektavslutet.</p>}

      </div>
      {project && loaded && (
        <div className="flex flex-1 overflow-hidden border-t">
          <aside className="hidden w-60 shrink-0 overflow-y-auto border-r bg-muted/30 p-3 lg:block">
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase text-muted-foreground">Innehåll</p>
            <nav className="space-y-0.5">
              {CLOSEOUT_SECTIONS.map(s => {
                const ok = s.items.every(i => data.checks[i.key]);
                return (
                  <button key={s.key} onClick={() => goTo(s.key)} className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent', active === s.key && 'bg-primary/10 font-semibold text-primary ring-1 ring-primary/30')}>
                    {ok ? <CircleCheck className="h-3.5 w-3.5 shrink-0 text-status-completed" /> : <CircleAlert className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    <span className="truncate">{s.title.replace(/^\d+\.\s*/, '')}</span>
                  </button>
                );
              })}
              <div className="my-2 border-t" />
              <button onClick={() => goTo('signoff')} className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors hover:bg-accent', active === 'signoff' && 'bg-primary/10 text-primary ring-1 ring-primary/30')}>
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />Slutlig sign-off
              </button>
            </nav>
          </aside>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="workspace-card border p-3 flex items-center gap-4">
            <span className="text-sm uppercase font-medium">Klart</span>
            <div className="flex-1 h-2 bg-muted"><div className="h-2 bg-primary" style={{ width: `${percent}%` }} /></div>
            <span className="text-sm tabular-nums">{done}/{allItems.length} · {percent}%</span>
          </div>

          {CLOSEOUT_SECTIONS.map(s => (
            <section key={s.key} id={`co-${s.key}`} className="workspace-card border scroll-mt-4">
              <h2 className="bg-[hsl(var(--list-header))] text-primary-foreground px-3 py-2 text-sm uppercase tracking-wide">{s.title}</h2>
              <div className="p-3 space-y-2">
                {s.items.map(i => (
                  <label key={i.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={!!data.checks[i.key]} disabled={signed.signed_off} onCheckedChange={v => update(d => ({ ...d, checks: { ...d.checks, [i.key]: !!v } }))} />
                    {i.label}
                  </label>
                ))}

                {s.key === 'deviations' && (
                  <ImportedList empty="Inga avvikelser registrerade i Uppföljning."
                    rows={kpi.deviations.map(d => ({ main: d.description || '–', tag: d.type }))} />
                )}
                {s.key === 'remarks' && (
                  <ImportedList empty="Inga besiktningsanmärkningar registrerade i Uppföljning."
                    rows={kpi.remarks.map(r => ({ main: r || '–' }))} />
                )}

                <Textarea placeholder="Kommentar" className="mt-2" value={data.notes[s.key] ?? ''} disabled={signed.signed_off} onChange={e => update(d => ({ ...d, notes: { ...d.notes, [s.key]: e.target.value } }))} />
              </div>
            </section>
          ))}

          <section id="co-signoff" className="workspace-card border scroll-mt-4">
            <h2 className="bg-[hsl(var(--list-header))] text-primary-foreground px-3 py-2 text-sm uppercase tracking-wide">4. Slutlig sign-off</h2>
            <div className="p-3 flex flex-wrap items-center gap-3">
              {signed.signed_off ? (
                <>
                  <span className="text-sm">Signerad av <strong>{signed.signed_by_name}</strong> {signed.signed_at?.slice(0, 10)}</span>
                  <Button size="sm" variant="ghost" onClick={() => signOff(false)}>Ångra sign-off</Button>
                  <Button size="sm" className="gap-2" disabled={project.status === 'Avslutat'} onClick={archive}><Archive className="h-4 w-4" />{project.status === 'Avslutat' ? 'Arkiverat' : 'Arkivera projekt'}</Button>
                </>
              ) : (
                <>
                  <Button size="sm" disabled={!ready} onClick={() => signOff(true)}>Signera projektavslut</Button>
                  {!ready && <span className="text-xs text-muted-foreground">Alla punkter måste vara klara innan sign-off.</span>}
                </>
              )}
            </div>
          </section>
          </div>
        </div>
      )}
    </div>
  );
}

function ImportedList({ rows, empty }: { rows: { main: string; tag?: string }[]; empty: string }) {
  return (
    <div className="pt-2">
      <p className="mb-1 text-[11px] uppercase text-muted-foreground">Hämtat från Uppföljning</p>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
        <ul className="divide-y border">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-1.5 text-sm">
              <span className="w-6 text-muted-foreground tabular-nums">{i + 1}.</span>
              <span className="flex-1">{r.main}</span>
              {r.tag && <span className="border px-2 py-0.5 text-[11px] uppercase text-muted-foreground">{r.tag}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
