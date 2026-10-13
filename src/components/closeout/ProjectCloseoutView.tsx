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
import { FileDown, Archive, Plus, Trash2 } from 'lucide-react';

type Deviation = { description: string; type: string; amount: string };
type CloseoutData = {
  checks: Record<string, boolean>;
  notes: Record<string, string>;
  deviations: Deviation[];
  budget?: string;
  outcome?: string;
};

export const CLOSEOUT_SECTIONS: { key: string; title: string; items: { key: string; label: string }[] }[] = [
  { key: 'deviations', title: '1. Avvikelser & ÄTA', items: [
    { key: 'dev_logged', label: 'Alla avvikelser under montage/produktion är registrerade' },
    { key: 'ata_invoiced', label: 'ÄTA-arbeten är fakturerade eller kostnadsförda' },
  ]},
  { key: 'inspection', title: '2. Slutbesiktning & relationshandlingar', items: [
    { key: 'final_inspection', label: 'Slutbesiktning genomförd och godkänd' },
    { key: 'remarks_closed', label: 'Besiktningsanmärkningar åtgärdade' },
    { key: 'om_manual', label: 'Drift- och skötselinstruktioner överlämnade' },
    { key: 'certificates', label: 'Intyg och certifikat överlämnade' },
    { key: 'as_built', label: 'Relationsritningar överlämnade' },
  ]},
  { key: 'finance', title: '3. Ekonomisk slutavstämning', items: [
    { key: 'final_invoice', label: 'Slutfaktura skickad' },
    { key: 'costs_booked', label: 'Alla kostnader bokförda' },
  ]},
  { key: 'lessons', title: '4. Erfarenhetsåterföring', items: [
    { key: 'lessons_meeting', label: 'Erfarenhetsmöte genomfört' },
  ]},
];

const empty: CloseoutData = { checks: {}, notes: {}, deviations: [] };

export function ProjectCloseoutView() {
  const { projects, updateProject } = useProjectDataContext();
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<string>('');
  const [data, setData] = useState<CloseoutData>(empty);
  const [signed, setSigned] = useState<{ signed_off: boolean; signed_by_name: string | null; signed_at: string | null }>({ signed_off: false, signed_by_name: null, signed_at: null });
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<number>();
  const project = projects.find(p => p.id === projectId) || null;

  useEffect(() => {
    if (!projectId) return;
    setLoaded(false);
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
      if (s.key === 'deviations' && data.deviations.length) {
        autoTable(doc, { startY: y, head: [['Avvikelse', 'Typ', 'Belopp (kr)']], body: data.deviations.map(d => [d.description, d.type, d.amount]), headStyles: { fillColor: [24, 50, 58] }, styles: { fontSize: 9 } });
        y = (doc as any).lastAutoTable.finalY + 4;
      }
      if (s.key === 'finance') {
        autoTable(doc, { startY: y, body: [['Kalkyl (kr)', data.budget || '–'], ['Utfall (kr)', data.outcome || '–']], styles: { fontSize: 9 } });
        y = (doc as any).lastAutoTable.finalY + 4;
      }
    }
    autoTable(doc, { startY: y, head: [['Sign-off', '']], body: [['Status', signed.signed_off ? `Signerad av ${signed.signed_by_name} ${signed.signed_at?.slice(0, 10)}` : 'Ej signerad']], headStyles: { fillColor: [28, 127, 114] }, styles: { fontSize: 9 } });
    doc.save(`Projektavslut_${project.code ?? project.name}.pdf`);
  };

  const sorted = useMemo(() => [...projects].sort((a, b) => (a.code ?? '').localeCompare(b.code ?? '', 'sv', { numeric: true })), [projects]);

  return (
    <div className="list-page p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="list-heading text-3xl uppercase">Projektavslut</h1>
          <p className="text-sm text-muted-foreground uppercase">Avvikelser, besiktning, efterkalkyl, erfarenheter och sign-off</p>
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

      {project && loaded && (
        <>
          <div className="workspace-card border p-3 flex items-center gap-4">
            <span className="text-sm uppercase font-medium">Klart</span>
            <div className="flex-1 h-2 bg-muted"><div className="h-2 bg-primary" style={{ width: `${percent}%` }} /></div>
            <span className="text-sm tabular-nums">{done}/{allItems.length} · {percent}%</span>
          </div>

          {CLOSEOUT_SECTIONS.map(s => (
            <section key={s.key} className="workspace-card border">
              <h2 className="bg-[hsl(var(--list-header))] text-primary-foreground px-3 py-2 text-sm uppercase tracking-wide">{s.title}</h2>
              <div className="p-3 space-y-2">
                {s.items.map(i => (
                  <label key={i.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={!!data.checks[i.key]} disabled={signed.signed_off} onCheckedChange={v => update(d => ({ ...d, checks: { ...d.checks, [i.key]: !!v } }))} />
                    {i.label}
                  </label>
                ))}

                {s.key === 'deviations' && (
                  <div className="space-y-2 pt-2">
                    {data.deviations.map((dv, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input placeholder="Beskrivning" value={dv.description} disabled={signed.signed_off} onChange={e => update(d => ({ ...d, deviations: d.deviations.map((x, j) => j === idx ? { ...x, description: e.target.value } : x) }))} />
                        <Select value={dv.type} disabled={signed.signed_off} onValueChange={v => update(d => ({ ...d, deviations: d.deviations.map((x, j) => j === idx ? { ...x, type: v } : x) }))}>
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="Fakturerad ÄTA">Fakturerad ÄTA</SelectItem><SelectItem value="Kostnad">Kostnad</SelectItem><SelectItem value="Ingen påverkan">Ingen påverkan</SelectItem></SelectContent>
                        </Select>
                        <Input className="w-32" placeholder="Belopp" inputMode="numeric" value={dv.amount} disabled={signed.signed_off} onChange={e => update(d => ({ ...d, deviations: d.deviations.map((x, j) => j === idx ? { ...x, amount: e.target.value } : x) }))} />
                        <Button size="icon" variant="ghost" disabled={signed.signed_off} onClick={() => update(d => ({ ...d, deviations: d.deviations.filter((_, j) => j !== idx) }))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" className="gap-1" disabled={signed.signed_off} onClick={() => update(d => ({ ...d, deviations: [...d.deviations, { description: '', type: 'Kostnad', amount: '' }] }))}><Plus className="h-4 w-4" />Avvikelse</Button>
                  </div>
                )}

                {s.key === 'finance' && (
                  <div className="grid grid-cols-2 gap-2 pt-2 max-w-md">
                    <label className="text-xs uppercase">Kalkyl (kr)<Input value={data.budget ?? ''} disabled={signed.signed_off} onChange={e => update(d => ({ ...d, budget: e.target.value }))} /></label>
                    <label className="text-xs uppercase">Utfall (kr)<Input value={data.outcome ?? ''} disabled={signed.signed_off} onChange={e => update(d => ({ ...d, outcome: e.target.value }))} /></label>
                  </div>
                )}

                <Textarea placeholder="Kommentar" className="mt-2" value={data.notes[s.key] ?? ''} disabled={signed.signed_off} onChange={e => update(d => ({ ...d, notes: { ...d.notes, [s.key]: e.target.value } }))} />
              </div>
            </section>
          ))}

          <section className="workspace-card border">
            <h2 className="bg-[hsl(var(--list-header))] text-primary-foreground px-3 py-2 text-sm uppercase tracking-wide">5. Slutlig sign-off</h2>
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
        </>
      )}
    </div>
  );
}
