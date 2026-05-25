import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { useResourceData } from '@/hooks/useResourceData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { Clock, TrendingUp, TrendingDown, Minus, Wrench, Car, CheckCircle2, Truck, ClipboardCheck, Printer, Save } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  accent?: 'default' | 'green' | 'red';
}

function StatCard({ title, value, icon, accent = 'default' }: StatCardProps) {
  const borderClass = {
    default: 'border-border/50',
    green: 'border-emerald-500/50 bg-emerald-500/5',
    red: 'border-red-500/50 bg-red-500/5',
  }[accent];

  const valueClass = {
    default: 'text-foreground',
    green: 'text-emerald-400',
    red: 'text-red-400',
  }[accent];

  return (
    <motion.div variants={cardVariants}>
      <Card className={cn('border bg-card/80', borderClass)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1">{title}</p>
              <p className={cn('text-2xl font-bold tabular-nums', valueClass)}>{value}</p>
            </div>
            <div className={cn(
              'shrink-0 rounded-md p-2 bg-muted/50',
              accent === 'green' && 'bg-emerald-500/10',
              accent === 'red' && 'bg-red-500/10',
            )}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-lg text-xs">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{entry.value}h</span>
        </div>
      ))}
    </div>
  );
};

export function ResourceAnalyticsView() {
  const { projects: allProjects } = useProjectDataContext();
  const { estimations, dailyEntries, isLoading } = useResourceData();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [archiveMode, setArchiveMode] = useState<'active' | 'archived'>('active');
  const reportRef = useRef<HTMLDivElement>(null);

  // KPI state
  const [ftr, setFtr] = useState<string>('');
  const [missing, setMissing] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [kpiNotes, setKpiNotes] = useState<string>('');
  const [ftrDetails, setFtrDetails] = useState<string[]>([]);
  const [missingDetails, setMissingDetails] = useState<string[]>([]);
  const [remarkDetails, setRemarkDetails] = useState<string[]>([]);
  const [savingKpi, setSavingKpi] = useState(false);

  // Sync detail array length to count number
  const syncDetails = (countStr: string, current: string[]): string[] => {
    const n = countStr === '' ? 0 : Math.max(0, parseInt(countStr) || 0);
    if (n === current.length) return current;
    if (n > current.length) return [...current, ...Array(n - current.length).fill('')];
    return current.slice(0, n);
  };

  useEffect(() => {
    if (!selectedProjectId) {
      setFtr(''); setMissing(''); setRemarks(''); setKpiNotes('');
      setFtrDetails([]); setMissingDetails([]); setRemarkDetails([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('project_kpi_metrics' as any)
        .select('*')
        .eq('project_id', selectedProjectId)
        .maybeSingle();
      const d: any = data || {};
      setFtr(d.first_time_right_percent != null ? String(d.first_time_right_percent) : '');
      setMissing(d.delivery_precision_missing != null ? String(d.delivery_precision_missing) : '');
      setRemarks(d.inspection_remarks != null ? String(d.inspection_remarks) : '');
      setKpiNotes(d.notes ?? '');
      setFtrDetails(Array.isArray(d.ftr_details) ? d.ftr_details : []);
      setMissingDetails(Array.isArray(d.missing_article_details) ? d.missing_article_details : []);
      setRemarkDetails(Array.isArray(d.inspection_remark_details) ? d.inspection_remark_details : []);
    })();
  }, [selectedProjectId]);

  const saveKpi = async () => {
    if (!selectedProjectId) return;
    setSavingKpi(true);
    const payload: any = {
      project_id: selectedProjectId,
      first_time_right_percent: ftr === '' ? null : parseFloat(ftr),
      delivery_precision_missing: missing === '' ? null : parseInt(missing),
      inspection_remarks: remarks === '' ? null : parseInt(remarks),
      notes: kpiNotes || null,
      ftr_details: ftrDetails,
      missing_article_details: missingDetails,
      inspection_remark_details: remarkDetails,
    };
    const { error } = await supabase.from('project_kpi_metrics' as any).upsert(payload, { onConflict: 'project_id' });
    setSavingKpi(false);
    if (error) toast.error('Kunde inte spara KPI:er');
    else toast.success('KPI:er sparade');
  };

  const printReport = () => {
    const el = reportRef.current;
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const styles = Array.from(document.styleSheets).map(s => {
      try { return Array.from(s.cssRules).map(r => r.cssText).join('\n'); } catch { return ''; }
    }).join('\n');
    const project = sortedProjects.find(p => p.id === selectedProjectId);
    const title = `Projektrapport – ${project?.code ? project.code + ' ' : ''}${project?.name ?? ''}`;
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>${styles}
      body { background: white !important; color: black !important; padding: 24px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @media print { body { padding: 0; } }
    </style></head><body><h1 style="margin-bottom:16px">${title}</h1>${el.innerHTML}</body></html>`);
    w.document.close();
    w.onload = () => { w.print(); w.close(); };
  };

  const sortedProjects = useMemo(() =>
    [...allProjects]
      .filter(p => archiveMode === 'archived' ? p.status === 'Avslutat' : p.status !== 'Avslutat')
      .sort((a, b) => (a.code || '').localeCompare(b.code || '')),
    [allProjects, archiveMode]
  );

  const estimation = useMemo(() =>
    estimations.find(e => e.projectId === selectedProjectId) ?? null,
    [estimations, selectedProjectId]
  );

  const projectEntries = useMemo(() =>
    dailyEntries.filter(e => e.projectId === selectedProjectId),
    [dailyEntries, selectedProjectId]
  );

  const actualWork = useMemo(() =>
    projectEntries.reduce((s, e) => s + e.plannedWorkHours, 0),
    [projectEntries]
  );

  const actualTravel = useMemo(() =>
    projectEntries.reduce((s, e) => s + e.plannedTravelHours, 0),
    [projectEntries]
  );

  const estimatedWork = estimation?.estimatedInstallHours ?? 0;
  const estimatedTravel = estimation?.estimatedTravelHours ?? 0;

  const workDeviation = actualWork - estimatedWork;
  const travelDeviation = actualTravel - estimatedTravel;
  const totalDeviation = (actualWork + actualTravel) - (estimatedWork + estimatedTravel);

  const hasEstimation = estimatedWork > 0 || estimatedTravel > 0;
  const hasData = actualWork > 0 || actualTravel > 0 || hasEstimation;

  const formatDeviation = (dev: number) => {
    if (dev === 0) return '±0h';
    return dev > 0 ? `+${dev}h` : `${dev}h`;
  };

  // Chart: only Montage and Resa (no Totalt)
  const chartData = [
    { name: 'Montage', 'Kalkyl': estimatedWork, 'Utfall': actualWork },
    { name: 'Resa', 'Kalkyl': estimatedTravel, 'Utfall': actualTravel },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5 p-6"
    >
      {/* Header + Project selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resursanalys</h1>
          <p className="text-sm text-muted-foreground">Jämför kalkyl mot utfall per projekt</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[280px] h-9">
              <SelectValue placeholder="Välj ett projekt…" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {sortedProjects.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.code ? `${p.code} – ` : ''}{p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProjectId && (
            <Button variant="outline" size="sm" onClick={printReport} className="h-9">
              <Printer className="h-4 w-4 mr-1.5" /> Rapport
            </Button>
          )}
        </div>
      </div>

      {!selectedProjectId && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-2">
          <TrendingUp className="h-10 w-10 opacity-20" />
          <p className="text-sm">Välj ett projekt för att se statistik</p>
        </div>
      )}

      {selectedProjectId && !hasData && !isLoading && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-2">
          <Clock className="h-10 w-10 opacity-20" />
          <p className="text-sm">Inga data för det valda projektet</p>
          <p className="text-xs">Lägg till en kalkyl och dagsnoteringar för att se statistik</p>
        </div>
      )}

      {selectedProjectId && (
        <div ref={reportRef} className="space-y-5">
          {(hasData || isLoading) && (
            <>
          {/* Total summary — full width, prominent */}
          {(() => {
            const totalEst = estimatedWork + estimatedTravel;
            const totalAct = actualWork + actualTravel;
            const pctDev = totalEst > 0 ? ((totalAct - totalEst) / totalEst) * 100 : 0;
            const overBudget = totalDeviation > 0;
            return (
              <motion.div variants={cardVariants}>
                <Card className={cn(
                  'border-2 bg-gradient-to-br',
                  !hasEstimation ? 'border-border/50 from-card to-card/60' :
                  overBudget ? 'border-red-500/60 from-red-500/10 to-red-500/5' :
                  'border-emerald-500/60 from-emerald-500/10 to-emerald-500/5'
                )}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'rounded-lg p-2.5',
                          !hasEstimation ? 'bg-muted/50' :
                          overBudget ? 'bg-red-500/15' : 'bg-emerald-500/15'
                        )}>
                          {totalDeviation === 0 ? <Minus className="h-5 w-5 text-muted-foreground" /> :
                           overBudget ? <TrendingUp className="h-5 w-5 text-red-500" /> :
                           <TrendingDown className="h-5 w-5 text-emerald-500" />}
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Totalsammanfattning</p>
                          <p className="text-sm text-muted-foreground">Kalkyl vs utfall för hela projektet</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Total kalkyl</p>
                          <p className="text-2xl font-bold tabular-nums">{totalEst}h</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Totalt utfall</p>
                          <p className="text-2xl font-bold tabular-nums">{totalAct}h</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Avvikelse</p>
                          <p className={cn('text-2xl font-bold tabular-nums',
                            !hasEstimation ? 'text-foreground' :
                            overBudget ? 'text-red-500' : 'text-emerald-500')}>
                            {formatDeviation(totalDeviation)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">% avvikelse</p>
                          <p className={cn('text-2xl font-bold tabular-nums',
                            !hasEstimation ? 'text-foreground' :
                            overBudget ? 'text-red-500' : 'text-emerald-500')}>
                            {hasEstimation ? `${pctDev > 0 ? '+' : ''}${pctDev.toFixed(1)}%` : '–'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })()}

          {/* Montage & Resa — separate, clear blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              { title: 'Montage', icon: Wrench, est: estimatedWork, act: actualWork, dev: workDeviation },
              { title: 'Resa', icon: Car, est: estimatedTravel, act: actualTravel, dev: travelDeviation },
            ] as const).map((block) => {
              const over = block.dev > 0;
              const pct = block.est > 0 ? ((block.act - block.est) / block.est) * 100 : 0;
              const noEst = block.est === 0;
              return (
                <motion.div key={block.title} variants={cardVariants}>
                  <Card className={cn(
                    'border-2 h-full',
                    noEst ? 'border-border/50 bg-card/80' :
                    over ? 'border-red-500/50 bg-red-500/5' :
                    'border-emerald-500/50 bg-emerald-500/5'
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'rounded-md p-2',
                            noEst ? 'bg-muted/50' :
                            over ? 'bg-red-500/15' : 'bg-emerald-500/15'
                          )}>
                            <block.icon className={cn('h-4 w-4',
                              noEst ? 'text-muted-foreground' :
                              over ? 'text-red-500' : 'text-emerald-500'
                            )} />
                          </div>
                          <div>
                            <CardTitle className="text-base">{block.title}</CardTitle>
                            <p className="text-[11px] text-muted-foreground">
                              {noEst ? 'Ingen kalkyl satt' : over ? 'Över kalkyl' : 'Inom kalkyl'}
                            </p>
                          </div>
                        </div>
                        <span className={cn(
                          'text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full',
                          noEst ? 'bg-muted text-muted-foreground' :
                          over ? 'bg-red-500/20 text-red-600' : 'bg-emerald-500/20 text-emerald-600'
                        )}>
                          {noEst ? '–' : over ? 'Röd' : 'Grön'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Kalkyl</p>
                          <p className="text-xl font-bold tabular-nums">{block.est}h</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Utfall</p>
                          <p className="text-xl font-bold tabular-nums">{block.act}h</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Avvikelse</p>
                          <p className={cn('text-xl font-bold tabular-nums',
                            noEst ? 'text-foreground' :
                            over ? 'text-red-500' : 'text-emerald-500')}>
                            {formatDeviation(block.dev)}
                          </p>
                          {!noEst && (
                            <p className={cn('text-[10px] tabular-nums',
                              over ? 'text-red-500' : 'text-emerald-500'
                            )}>
                              {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>


          {/* Bar chart – Montage & Resa only */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Kalkyl vs Utfall (timmar)</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }} barCategoryGap="40%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} unit="h" width={36} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12, color: 'hsl(var(--muted-foreground))' }} />
                  <Bar dataKey="Kalkyl" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} opacity={0.55} maxBarSize={72} />
                  <Bar dataKey="Utfall" radius={[3, 3, 0, 0]} maxBarSize={72}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.Utfall > d.Kalkyl ? 'hsl(0 84% 60%)' : 'hsl(142 71% 45%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
            </>
          )}

          {/* KPI / Kvalitet & leverans */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Kvalitet & leverans</CardTitle>
              <Button size="sm" onClick={saveKpi} disabled={savingKpi} className="h-8 print:hidden">
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {savingKpi ? 'Sparar…' : 'Spara'}
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    First-time-right (%)
                  </Label>
                  <Input type="number" min="0" max="100" step="0.1" value={ftr} onChange={e => setFtr(e.target.value)} placeholder="t.ex. 92" className="h-9" />
                  <p className="text-[10px] text-muted-foreground mt-1">Andel egenkontrollpunkter rätt första gången</p>
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                    <Truck className="h-3.5 w-3.5 text-blue-500" />
                    Saknade artiklar vid leverans
                  </Label>
                  <Input type="number" min="0" step="1" value={missing} onChange={e => { setMissing(e.target.value); setMissingDetails(syncDetails(e.target.value, missingDetails)); }} placeholder="antal" className="h-9" />
                  <p className="text-[10px] text-muted-foreground mt-1">Leveransprecision från produktion</p>
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                    <ClipboardCheck className="h-3.5 w-3.5 text-amber-500" />
                    Besiktningsanmärkningar
                  </Label>
                  <Input type="number" min="0" step="1" value={remarks} onChange={e => { setRemarks(e.target.value); setRemarkDetails(syncDetails(e.target.value, remarkDetails)); }} placeholder="antal" className="h-9" />
                  <p className="text-[10px] text-muted-foreground mt-1">Antal anmärkningar vid besiktning</p>
                </div>
              </div>

              {/* Detail lists */}
              {[
                { title: 'Saknade artiklar – beskrivning per artikel', icon: <Truck className="h-3.5 w-3.5 text-blue-500" />, items: missingDetails, setItems: setMissingDetails, placeholder: 'Beskriv den saknade artikeln…' },
                { title: 'Besiktningsanmärkningar – beskrivning per anmärkning', icon: <ClipboardCheck className="h-3.5 w-3.5 text-amber-500" />, items: remarkDetails, setItems: setRemarkDetails, placeholder: 'Beskriv anmärkningen…' },
              ].map((section) => section.items.length > 0 && (
                <div key={section.title} className="border-t border-border/50 pt-3">
                  <Label className="text-xs flex items-center gap-1.5 mb-2">{section.icon}{section.title}</Label>
                  <div className="space-y-2">
                    {section.items.map((val, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[11px] text-muted-foreground font-semibold mt-2 w-5 shrink-0">#{i + 1}</span>
                        <Textarea
                          value={val}
                          onChange={e => {
                            const next = [...section.items];
                            next[i] = e.target.value;
                            section.setItems(next);
                          }}
                          placeholder={section.placeholder}
                          className="min-h-[50px] text-sm flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <Label className="text-xs mb-1.5 block">Övrig kommentar</Label>
                <Textarea value={kpiNotes} onChange={e => setKpiNotes(e.target.value)} placeholder="Noteringar om kvalitet, leverans eller besiktning…" className="min-h-[70px] text-sm" />
              </div>

              {/* KPI summary tiles for report */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/50">
                <div className="rounded-md bg-muted/40 p-2">
                  <p className="text-[10px] text-muted-foreground">First-time-right</p>
                  <p className="text-lg font-bold tabular-nums">{ftr ? `${ftr}%` : '–'}</p>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <p className="text-[10px] text-muted-foreground">Saknade artiklar</p>
                  <p className="text-lg font-bold tabular-nums">{missing || '–'}</p>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <p className="text-[10px] text-muted-foreground">Montage avv.</p>
                  <p className={cn('text-lg font-bold tabular-nums', hasEstimation && (workDeviation > 0 ? 'text-red-500' : 'text-emerald-500'))}>
                    {hasEstimation ? formatDeviation(workDeviation) : '–'}
                  </p>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <p className="text-[10px] text-muted-foreground">Besiktn.anm.</p>
                  <p className="text-lg font-bold tabular-nums">{remarks || '–'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  );
}
