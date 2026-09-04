import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardCheck, Search, FileDown, Loader2, AlertTriangle, CircleCheck,
  CircleAlert, Plus, ShieldCheck, RotateCcw, Info, ArrowLeft, Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { useProjectReview } from '@/hooks/useProjectReview';
import { useProfiles, getDisplayName } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { REVIEW_STATUSES, ReviewSection, riskLevel, SIGNOFF_ROLE, SIGNOFF_STATEMENT } from '@/lib/reviewTemplate';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ReviewFieldInput } from './ReviewFieldInput';
import { ReviewTableSection } from './ReviewTableSection';
import { generateReviewSummaryPdf } from '@/lib/reviewReport';
import { ReviewOverviewList } from './ReviewOverviewList';
import { useReviewOverview } from '@/hooks/useReviewOverview';

export function ProjectReviewView() {
  const { projects } = useProjectDataContext();
  const { profiles } = useProfiles();
  const { user } = useAuth();
  const { toast } = useToast();
  const [projectId, setProjectId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [openSections, setOpenSections] = useState<string[]>([]);

  const { overview, loading: overviewLoading, reload: reloadOverview } = useReviewOverview();
  const project = projects.find(p => p.id === projectId) || null;
  const {
    review, template, answers, rows, signoffs, events, loading, saving,
    createReview, updateReview, setAnswer, addRow, updateRow, deleteRow, setSignoff, deleteReview,
  } = useProjectReview(projectId || null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sections = template.sections;

  const sectionRows = (key: string) => rows.filter(r => r.section_key === key);

  /** Manuell markering: avsnittet är genomgånget även om inget fyllts i. */
  const ackKey = (key: string) => `${key}.__reviewed`;
  const isSectionAcked = (key: string) => answers[ackKey(key)]?.value === 'Ja';
  const toggleAck = (key: string, next: boolean) => setAnswer(key, ackKey(key), { value: next ? 'Ja' : '' });

  const isSectionFilled = (s: ReviewSection): boolean => {
    if (s.kind === 'table') {
      const rs = sectionRows(s.key);
      if (rs.length === 0) return false;
      return rs.every(r => (s.columns || []).filter(c => c.required).every(c => !!r.data[c.key]));
    }
    const fields = s.fields || [];
    if (!fields.length) return false;
    const answered = fields.filter(f => {
      const a = answers[`${s.key}.${f.key}`];
      return a && a.value !== null && a.value !== undefined && a.value !== '';
    }).length;
    const requiredOk = fields.filter(f => f.required).every(f => {
      const a = answers[`${s.key}.${f.key}`];
      return a && a.value !== null && a.value !== undefined && a.value !== '';
    });
    return requiredOk && answered >= Math.ceil(fields.length * 0.8);
  };

  const isSectionDone = (s: ReviewSection): boolean => isSectionFilled(s) || isSectionAcked(s.key);


  const progress = useMemo(() => {
    const total = sections.length;
    const done = sections.filter(isSectionDone).length;
    return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, rows, answers]);

  /** Automatiskt insamlade öppna punkter från hela genomgången */
  const derivedOpenPoints = useMemo(() => {
    const list: { point: string; category: string; source: string }[] = [];
    sectionRows('scope').filter(r => r.data.included === 'Oklart')
      .forEach(r => list.push({ point: `Oklar omfattning: ${r.data.category || ''} ${r.data.description || ''}`.trim(), category: 'Såld omfattning', source: r.data.doc_ref || '' }));
    sectionRows('requirements').filter(r => !r.data.responsible || !r.data.verification)
      .forEach(r => list.push({ point: `Ska-krav utan ansvarig/verifiering: ${String(r.data.requirement || '').slice(0, 80)}`, category: 'Ska-krav', source: r.data.source || '' }));
    sectionRows('deviations').filter(r => !r.data.decision)
      .forEach(r => list.push({ point: `Obeslutad avvikelse: ${String(r.data.difference || '').slice(0, 80)}`, category: 'Avvikelser', source: `${r.data.source1 || ''} / ${r.data.source2 || ''}` }));
    sectionRows('verbal').filter(r => r.data.written_confirmation === 'Nej')
      .forEach(r => list.push({ point: `Obekräftad muntlig överenskommelse: ${String(r.data.what || '').slice(0, 80)}`, category: 'Överenskommelser', source: r.data.by_whom || '' }));
    sectionRows('options').filter(r => r.data.in_order !== 'Ja' && r.data.status !== 'Avböjd')
      .forEach(r => list.push({ point: `Option ej beslutad: ${r.data.number || ''} ${r.data.description || ''}`.trim(), category: 'Optioner', source: r.data.decision_deadline ? `Beslut senast ${r.data.decision_deadline}` : '' }));
    // Punkter som manuellt markerats för uppföljning
    rows.filter(r => r.section_key !== 'open_points' && r.data.followup === 'Ja').forEach(r => {
      const sec = sections.find(x => x.key === r.section_key);
      const firstCol = (sec?.columns || [])[0];
      const label = r.data.followup_note || (firstCol ? String(r.data[firstCol.key] ?? '') : '');
      list.push({
        point: `Uppföljning: ${String(label || sec?.title || '').slice(0, 100)}`,
        category: sec?.title || r.section_key,
        source: [r.data.followup_responsible, r.data.followup_deadline].filter(Boolean).join(' · '),
      });
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  /** Slutkontroll */
  const gate = useMemo(() => {
    const critical: string[] = [];
    if (sectionRows('documents').length === 0) critical.push('Inga handlingar registrerade');
    if (sectionRows('documents').some(r => r.data.reviewed !== 'Ja')) critical.push('Alla handlingar är inte genomgångna');
    if (sectionRows('requirements').some(r => !r.data.responsible)) critical.push('Ska-krav saknar ansvarig');
    if (sectionRows('scope').some(r => r.data.included === 'Oklart')) critical.push('Oklar omfattning – ansvar/innehåll ej fastställt');
    if (sectionRows('attendees').length === 0) critical.push('Inga deltagare registrerade');

    const openCount = sectionRows('open_points').filter(r => r.data.status !== 'Klar').length + derivedOpenPoints.length;
    const approvedAreas = sections.filter(isSectionDone).length;
    return { critical, openCount, approvedAreas };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, answers, derivedOpenPoints, sections]);

  const canApprove = gate.critical.length === 0;

  const header = review?.header || {};
  const setHeader = (key: string, value: any) => updateReview({ header: { ...header, [key]: value } } as any);

  const autoValue = (autoFrom?: string) => {
    if (!project || !autoFrom) return '';
    const map: Record<string, any> = {
      code: project.code, name: project.name, customer: project.customer,
      address: project.address, projectManager: project.projectManager,
      salesPerson: project.salesPerson, product: project.product,
    };
    return map[autoFrom] ?? '';
  };

  const currentUserName = (() => {
    const p = profiles.find(pr => pr.user_id === user?.id);
    return (p && getDisplayName(p)) || user?.email || 'Okänd';
  })();

  const mainSignoff = signoffs.find(s => s.role === SIGNOFF_ROLE) || null;
  const attendeeNames = sectionRows('attendees')
    .map(r => [r.data.name, r.data.role].filter(Boolean).join(' – '))
    .filter(Boolean);

  const exportPdf = () => {
    if (!project || !review) return;
    generateReviewSummaryPdf({ project, review, sections, answers, rows, signoffs, progress });
    toast({ title: 'Sammanfattning exporterad', description: 'PDF har skapats.' });
  };

  const filteredSections = search
    ? sections.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        (s.fields || []).some(f => f.label.toLowerCase().includes(search.toLowerCase())) ||
        (s.columns || []).some(f => f.label.toLowerCase().includes(search.toLowerCase())) ||
        sectionRows(s.key).some(r => JSON.stringify(r.data).toLowerCase().includes(search.toLowerCase())))
    : sections;

  // Markera aktivt avsnitt i innehållsmenyn medan man skrollar
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !review) return;
    const keys = [...sections.map(x => x.key), 'gate', 'signoff'];
    const onScroll = () => {
      let current = keys[0];
      for (const k of keys) {
        const node = document.getElementById(`sec-${k}`);
        if (!node) continue;
        if (node.getBoundingClientRect().top - el.getBoundingClientRect().top <= 96) current = k;
      }
      setActiveSection(current);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [sections, review, openSections]);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Projektgenomgång</h1>
          </div>
          {projectId && (
            <Button size="sm" variant="ghost" className="gap-2 h-9" onClick={() => { setProjectId(''); reloadOverview(); }}>
              <ArrowLeft className="h-4 w-4" />Alla projekt
            </Button>
          )}
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="h-9 w-[280px]"><SelectValue placeholder="Välj projekt" /></SelectTrigger>
            <SelectContent className="z-50 bg-popover max-h-[320px]">
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.code} – {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {review && (
            <>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Sök i genomgången" className="h-9 w-[220px] pl-7 text-sm" />
              </div>
              <div className="ml-auto flex items-center gap-2">
                {saving && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Sparar…</span>}
                <Button size="sm" variant="outline" className="gap-2" onClick={exportPdf}>
                  <FileDown className="h-4 w-4" />Exportera sammanfattning
                </Button>
                <Button size="sm" variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" />Radera genomgång
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {!projectId && (
        overviewLoading
          ? <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          : <ReviewOverviewList projects={projects.filter(p => overview[p.id]) as any} overview={overview} onOpen={setProjectId} />
      )}

      {projectId && loading && (
        <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      )}

      {projectId && !loading && !review && (
        <div className="flex flex-1 items-center justify-center p-10">
          <Card className="max-w-md text-center">
            <CardContent className="space-y-4 p-8">
              <ClipboardCheck className="mx-auto h-10 w-10 text-primary" />
              <p className="text-sm text-muted-foreground">
                Ingen projektgenomgång finns för {project?.code} – {project?.name}. Skapa en från gällande mall
                ({template.name}, version {template.version}). Mallversionen låses till detta projekt.
              </p>
              <Button className="gap-2" onClick={async () => {
                const seed: Record<string, any> = {
                  customer: autoValue('customer'),
                  project_number: autoValue('code'),
                  sales_person: autoValue('salesPerson'),
                  project_manager: autoValue('projectManager'),
                };
                const r = await createReview(seed);
                if (r) toast({ title: 'Projektgenomgång skapad' });
              }}>
                <Plus className="h-4 w-4" />Starta projektgenomgång
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {projectId && review && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left nav */}
          <aside className="hidden w-60 shrink-0 overflow-y-auto border-r bg-muted/30 p-3 lg:block">
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Innehåll</p>
            <nav className="space-y-0.5">
              {sections.map(s => {
                const done = isSectionDone(s);
                return (
                  <button
                    key={s.key}
                    onClick={() => {
                      setOpenSections(prev => prev.includes(s.key) ? prev : [...prev, s.key]);
                      setTimeout(() => document.getElementById(`sec-${s.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent',
                      activeSection === s.key && 'bg-primary/10 font-semibold text-primary ring-1 ring-primary/30',
                    )}
                  >
                    {done ? <CircleCheck className="h-3.5 w-3.5 shrink-0 text-status-completed" />
                          : <CircleAlert className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    <span className="truncate">{s.title}</span>
                  </button>
                );
              })}
              <Separator className="my-2" />
              {['gate', 'signoff'].map(k => (
                <button key={k} onClick={() => document.getElementById(`sec-${k}`)?.scrollIntoView({ behavior: 'smooth' })}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors hover:bg-accent',
                    activeSection === k && 'bg-primary/10 text-primary ring-1 ring-primary/30',
                  )}>
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {k === 'gate' ? 'Slutkontroll' : 'Godkännande'}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {/* Header card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">PROJEKTGENOMGÅNG</CardTitle>
                    <p className="text-sm text-muted-foreground">{project?.code} – {project?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Mall v{review.template_version}</Badge>
                    <Select value={review.status} onValueChange={(v) => updateReview({ status: v })}>
                      <SelectTrigger className="h-8 w-[220px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        {REVIEW_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <HeaderField label="Kund" value={header.customer ?? project?.customer ?? ''} onChange={v => setHeader('customer', v)} />
                  <HeaderField label="Projektnummer" value={header.project_number ?? project?.code ?? ''} onChange={v => setHeader('project_number', v)} />
                  <HeaderField label="Ordernummer" value={header.order_number ?? ''} onChange={v => setHeader('order_number', v)} />
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Datum för genomgång</label>
                    <Input type="date" className="h-8 text-sm" value={review.review_date ?? ''} onChange={e => updateReview({ review_date: e.target.value })} />
                  </div>
                  <HeaderField label="Ansvarig säljare" value={header.sales_person ?? project?.salesPerson ?? ''} onChange={v => setHeader('sales_person', v)} />
                  <HeaderField label="Konstruktionschef" value={header.design_lead ?? ''} onChange={v => setHeader('design_lead', v)} />
                  <HeaderField label="Projektledare" value={header.project_manager ?? project?.projectManager ?? ''} onChange={v => setHeader('project_manager', v)} />
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Version</label>
                    <Input type="number" className="h-8 text-sm" value={review.version} onChange={e => updateReview({ version: Number(e.target.value) || 1 })} />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">Projektgenomgång {progress.percent} % klar</span>
                    <span className="text-muted-foreground">{progress.done} av {progress.total} huvudområden genomgångna</span>
                  </div>
                  <Progress value={progress.percent} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Sections */}
            <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-3">
              {filteredSections.map(s => {
                const filled = isSectionFilled(s);
                const acked = isSectionAcked(s.key);
                const done = filled || acked;
                return (
                  <AccordionItem key={s.key} value={s.key} id={`sec-${s.key}`} className="rounded-lg border bg-card px-4">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex flex-1 items-center gap-2 pr-3">
                        <span className="text-sm font-semibold">{s.title}</span>
                        {done
                          ? <Badge className="bg-status-completed/15 text-status-completed border-status-completed/30 text-[10px]">
                              {filled ? 'Genomgången' : 'Genomgången (utan noteringar)'}
                            </Badge>
                          : <Badge variant="outline" className="text-[10px] text-muted-foreground">Ej komplett</Badge>}
                        {s.kind === 'table' && <span className="text-[11px] text-muted-foreground">{sectionRows(s.key).length} rader</span>}
                        <span
                          role="checkbox"
                          aria-checked={acked}
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); toggleAck(s.key, !acked); }}
                          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); toggleAck(s.key, !acked); } }}
                          className={cn(
                            'ml-auto flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors',
                            acked ? 'border-status-completed/40 bg-status-completed/10 text-status-completed' : 'text-muted-foreground hover:bg-accent',
                          )}
                        >
                          <CircleCheck className={cn('h-3.5 w-3.5', !acked && 'opacity-40')} />
                          Genomgånget
                        </span>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="pb-4">
                      {s.kind === 'table' ? (
                        <div className="space-y-4">
                          <ReviewTableSection
                            section={s}
                            rows={sectionRows(s.key)}
                            onAdd={() => addRow(s.key)}
                            onUpdate={updateRow}
                            onDelete={deleteRow}
                          />
                          {s.key === 'open_points' && derivedOpenPoints.length > 0 && (
                            <div className="rounded-lg border border-status-risk/40 bg-status-risk/5 p-3">
                              <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-status-risk">
                                <AlertTriangle className="h-3.5 w-3.5" />Automatiskt identifierade öppna punkter ({derivedOpenPoints.length})
                              </p>
                              <ul className="space-y-1 text-xs">
                                {derivedOpenPoints.map((p, i) => (
                                  <li key={i} className="flex items-center justify-between gap-2 rounded border bg-card px-2 py-1">
                                    <span><span className="text-muted-foreground">[{p.category}]</span> {p.point}</span>
                                    <Button size="sm" variant="ghost" className="h-6 text-[11px]"
                                      onClick={() => addRow('open_points', { point: p.point, category: p.category, source: p.source, status: 'Öppen', priority: 'Hög' })}>
                                      Lägg till
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {s.key === 'scope' && (
                            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                              <p className="mb-1 text-xs font-semibold text-destructive">EJ INGÅENDE</p>
                              {sectionRows('scope').filter(r => r.data.included === 'Ingår ej').length === 0
                                ? <p className="text-xs text-muted-foreground">Inga undantag dokumenterade ännu.</p>
                                : <ul className="list-disc space-y-0.5 pl-4 text-xs">
                                    {sectionRows('scope').filter(r => r.data.included === 'Ingår ej').map(r => (
                                      <li key={r.id}><strong>{r.data.category}:</strong> {r.data.description || '–'} {r.data.doc_ref ? `(${r.data.doc_ref})` : ''}</li>
                                    ))}
                                  </ul>}
                            </div>
                          )}
                          {(s.fields || []).map(f => (
                            <div key={f.key}>
                              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{f.label}</label>
                              <ReviewFieldInput
                                field={f}
                                value={answers[`${s.key}.${f.key}`]?.value ?? ''}
                                onChange={(v) => setAnswer(s.key, `${s.key}.${f.key}`, { value: v })}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                          {(s.fields || []).map(f => {
                            const key = `${s.key}.${f.key}`;
                            const a = answers[key];
                            const missing = f.required && !a?.value;
                            return (
                              <div key={f.key} className={cn('rounded-lg border p-3', missing ? 'border-destructive/40' : 'border-border')}>
                                <div className="grid gap-2 md:grid-cols-12 md:items-start">
                                  <div className="md:col-span-4">
                                    <p className="text-xs font-medium">
                                      {f.label}{f.required && <span className="text-destructive"> *</span>}
                                    </p>
                                    {missing && <p className="text-[10px] text-destructive">Obligatorisk punkt</p>}
                                  </div>
                                  <div className="md:col-span-3">
                                    <ReviewFieldInput field={f} value={a?.value ?? ''} onChange={(v) => setAnswer(s.key, key, { value: v })} compact />
                                  </div>
                                  <div className={cn('grid gap-2', s.hideTraceability ? 'md:col-span-5' : 'md:col-span-5 grid-cols-2 lg:grid-cols-4')}>
                                    {!s.hideTraceability && (
                                      <>
                                        <Input className="h-8 text-xs" placeholder="Källa" value={a?.source ?? ''} onChange={e => setAnswer(s.key, key, { source: e.target.value })} />
                                        <Input className="h-8 text-xs" placeholder="Dokument" value={a?.document_ref ?? ''} onChange={e => setAnswer(s.key, key, { document_ref: e.target.value })} />
                                        <Input className="h-8 text-xs" placeholder="Rev / sida" value={a?.revision ?? ''} onChange={e => setAnswer(s.key, key, { revision: e.target.value })} />
                                        <Input className="h-8 text-xs" placeholder="Ansvarig" value={a?.responsible ?? ''} onChange={e => setAnswer(s.key, key, { responsible: e.target.value })} />
                                      </>
                                    )}
                                    <Textarea className={cn('text-xs', !s.hideTraceability && 'col-span-2 lg:col-span-4')} rows={1} placeholder="Kommentar" value={a?.comment ?? ''} onChange={e => setAnswer(s.key, key, { comment: e.target.value })} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            {/* General question */}
            <Card id="sec-general">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Info className="h-4 w-4 text-primary" />
                  Finns det någon information, överenskommelse, förutsättning eller risk som vi känner till men som ännu inte dokumenterats ovan?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea rows={3} value={review.general_note ?? ''} onChange={e => updateReview({ general_note: e.target.value })} />
              </CardContent>
            </Card>

            {/* Final gate */}
            <Card id="sec-gate" className={cn('border-2', canApprove ? 'border-status-completed/40' : 'border-destructive/40')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Projektgenomgång – slutkontroll</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-3 text-sm">
                  <Badge className="bg-destructive/15 text-destructive border-destructive/30">🔴 {gate.critical.length} kritiska punkter kvar</Badge>
                  <Badge className="bg-status-risk/15 text-status-risk border-status-risk/30">🟡 {gate.openCount} öppna punkter</Badge>
                  <Badge className="bg-status-completed/15 text-status-completed border-status-completed/30">🟢 {gate.approvedAreas} områden godkända</Badge>
                </div>
                {gate.critical.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-destructive">Kritiska brister</p>
                    <ul className="list-disc space-y-0.5 pl-5 text-xs text-destructive">
                      {gate.critical.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
                {canApprove && <p className="text-xs text-status-completed">Alla obligatoriska kontrollpunkter är uppfyllda – genomgången kan godkännas.</p>}
              </CardContent>
            </Card>

            {/* Sign-off */}
            <Card id="sec-signoff">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Godkännande (sign-off)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={cn('rounded-lg border p-3', mainSignoff?.approved && 'border-status-completed/40 bg-status-completed/5')}>
                  <p className="mb-2 text-xs text-muted-foreground">{SIGNOFF_STATEMENT}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {mainSignoff?.approved ? (
                      <>
                        <span>Godkänd av: <strong>{mainSignoff.approved_name || '–'}</strong></span>
                        <span>Datum: <strong>{mainSignoff.approved_at ? new Date(mainSignoff.approved_at).toLocaleString('sv-SE') : '–'}</strong></span>
                        <Button size="sm" variant="outline" className="gap-2 h-7" onClick={() => setSignoff(SIGNOFF_ROLE, false, currentUserName)}>
                          <RotateCcw className="h-3.5 w-3.5" />Återkalla
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" className="gap-2 h-7" disabled={!canApprove}
                        onClick={() => setSignoff(SIGNOFF_ROLE, true, currentUserName)}>
                        <ShieldCheck className="h-3.5 w-3.5" />Godkänn som {currentUserName}
                      </Button>
                    )}
                  </div>
                  {mainSignoff?.approved && (
                    <div className="mt-3 border-t pt-2">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Närvarande som deltagit i genomgången</p>
                      {attendeeNames.length === 0
                        ? <p className="text-xs text-muted-foreground">Inga deltagare registrerade.</p>
                        : (
                          <ul className="grid gap-0.5 text-xs sm:grid-cols-2">
                            {attendeeNames.map((n, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <CircleCheck className="h-3 w-3 text-status-completed" />{n}
                              </li>
                            ))}
                          </ul>
                        )}
                    </div>
                  )}
                </div>
                {!canApprove && <p className="text-xs text-destructive">Genomgången kan inte slutligt godkännas medan kritiska kontrollpunkter saknas.</p>}
              </CardContent>
            </Card>


            {/* Audit log */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Historik</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-xs">
                {events.length === 0 && <p className="text-muted-foreground">Ingen historik ännu.</p>}
                {events.map(e => (
                  <div key={e.id} className="flex justify-between gap-3 border-b py-1 last:border-0">
                    <span>{e.action}{e.target ? ` – ${e.target}` : ''}</span>
                    <span className="text-muted-foreground">{e.actor_name || 'Okänd'} · {new Date(e.created_at).toLocaleString('sv-SE')}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Radera projektgenomgången?</AlertDialogTitle>
            <AlertDialogDescription>
              Hela genomgången för {project?.code} – {project?.name} raderas permanent, inklusive alla svar,
              rader, godkännanden och historik. Åtgärden går inte att ångra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const ok = await deleteReview();
                setConfirmDelete(false);
                if (ok) {
                  setProjectId('');
                  reloadOverview();
                  toast({ title: 'Projektgenomgång raderad' });
                } else {
                  toast({ title: 'Kunde inte radera', variant: 'destructive' });
                }
              }}
            >Radera permanent</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function HeaderField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</label>
      <Input className="h-8 text-sm" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
