import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban,
  Clock,
  AlertTriangle,
  Printer,
  Monitor,
  Factory,
  Wrench,
  Check,
  X,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw,
  MessageSquare } from
'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { Phase } from '@/data/projectData';


const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 26 }
  }
};

const phaseConfig: Record<Phase, {icon: typeof Monitor;bg: string;accent: string;}> = {
  Konstruktion: {
    icon: Monitor,
    bg: 'bg-[hsl(160_20%_55%)]',
    accent: 'hsl(160 20% 55%)'
  },
  Produktion: {
    icon: Factory,
    bg: 'bg-[hsl(168_35%_18%)]',
    accent: 'hsl(168 35% 18%)'
  },
  Montage: {
    icon: Wrench,
    bg: 'bg-[hsl(160_55%_36%)]',
    accent: 'hsl(160 55% 36%)'
  }
};

function AnimatedNumber({ value, duration = 900, decimals = 0 }: {value: number;duration?: number;decimals?: number;}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  return <>{decimals > 0 ? display.toFixed(decimals) : Math.round(display)}</>;
}

const printSection = (element: HTMLElement | null, title: string) => {
  if (!element) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const styles = Array.from(document.styleSheets).
  map((sheet) => {
    try {return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');}
    catch {return '';}
  }).
  join('\n');
  printWindow.document.write(
    `<!DOCTYPE html><html><head><title>${title}</title><style>${styles}
    body { background: white !important; color: black !important; padding: 24px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @media print { body { padding: 0; } }
  </style></head><body>${element.innerHTML}</body></html>`
  );
  printWindow.document.close();
  printWindow.onload = () => {printWindow.print();printWindow.close();};
};

export function Dashboard() {
  const {
    projects, monthlyTotals, yearTotal, forecast, forecastEvents, deleteForecastEvent, salesTargets, addCustomEvent
  } = useProjectDataContext();
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const forecastRef = useRef<HTMLDivElement>(null);
  const [chartPeriod, setChartPeriod] = useState<string>('2026');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventProject, setNewEventProject] = useState('');
  const [newEventDetails, setNewEventDetails] = useState('');

  // Check admin status
  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);


  const allActivities = projects.flatMap((p) => p.activities);
  const inProgressActivities = allActivities.filter((a) => a.status === 'Pågår').length;
  const delayedList = allActivities.filter((a) => a.status === 'Försenad');
  const riskList = allActivities.filter((a) => a.status === 'Risk för försening');
  const delayedActivities = delayedList.length;
  const atRiskActivities = riskList.length;
  const activeProjects = projects.filter((p) => p.status !== 'Avslutat');


  const projectsByPhase = (['Konstruktion', 'Produktion', 'Montage'] as Phase[]).map((phase) => ({
    phase,
    projects: projects.filter(
      (p) => p.status !== 'Avslutat' && p.activities.some((a) => a.phase === phase && (a.status === 'Pågår' || a.status === 'Försenad' || a.status === 'Risk för försening'))
    )
  }));

  // Build chart period labels
  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const currentYear = now.getFullYear();

  const chartLabels: { month: string; year: number }[] = (() => {
    if (chartPeriod === 'rolling') {
      const labels: { month: string; year: number }[] = [];
      for (let i = 0; i < 12; i++) {
        const idx = (currentMonthIndex + i) % 12;
        const yr = currentYear + Math.floor((currentMonthIndex + i) / 12);
        labels.push({ month: months[idx], year: yr });
      }
      return labels;
    }
    const yr = parseInt(chartPeriod);
    return months.map((m) => ({ month: m, year: yr }));
  })();

  const chartData = chartLabels.map(({ month, year }) => {
    let fakturerad = 0;
    let order = 0;
    let budget = 0;
    let offert = 0;
    forecast.forEach((f) => {
      if (f.dealStatus === 'Förlorad') return;
      const entries = (f.monthEntries || []).filter((e) => e.year === year && e.month === month);
      const sum = entries.reduce((s, e) => s + e.amount, 0);
      if (f.dealStatus === 'Fakturerad') {
        fakturerad += sum;
      } else if (f.dealStatus === 'Order') {
        order += sum;
      } else if (f.dealStatus === 'Budget') {
        budget += sum;
      } else if (f.dealStatus === 'Offert') {
        offert += sum;
      }
    });
    const label = chartPeriod === 'rolling' ? `${month} ${String(year).slice(2)}` : month;
    return { month: label, fakturerad, order, budget, offert };
  });

  const chartYearTotal = chartData.reduce((s, d) => s + d.fakturerad + d.order + d.budget + d.offert, 0);

  // Target uses selected year (or current year for rolling)
  const targetYear = chartPeriod === 'rolling' ? currentYear : parseInt(chartPeriod);
  const salesTarget = salesTargets[targetYear] || 0;

  const takenTotal = chartData.reduce((s, d) => s + d.fakturerad + d.order, 0);
  const pct = salesTarget > 0 ? Math.min(takenTotal / salesTarget * 100, 100) : 0;

  const periodLabel = chartPeriod === 'rolling' ? 'Rullande 12 mån' : chartPeriod;

  return (
    <motion.div
      ref={printRef}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5 p-6 print:p-2">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          
        </div>
        <Button variant="outline" size="sm" onClick={() => printSection(printRef.current, 'Dashboard')} className="print:hidden gap-2">
          <Printer className="h-4 w-4" />
          Skriv ut
        </Button>
      </div>

      {/* ── ROW 1: Key figures (plain) ── */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {[
          { label: 'Aktiva projekt', value: activeProjects.length, icon: FolderKanban, tone: 'text-primary', bg: 'bg-primary/10', ring: 'border-primary/30' },
          { label: 'Försenade aktiviteter', value: delayedActivities, icon: AlertTriangle, tone: 'text-status-delayed', bg: 'bg-status-delayed/10', ring: 'border-status-delayed/30' },
          { label: 'Risk för försening', value: atRiskActivities, icon: Clock, tone: 'text-status-risk', bg: 'bg-status-risk/10', ring: 'border-status-risk/30' },
        ].map((s) => (
          <motion.div key={s.label} variants={itemVariants}>
            <div className={`flex items-center justify-between gap-3 rounded-xl border ${s.ring} ${s.bg} px-4 py-3 h-full`}>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className={`text-3xl font-bold leading-tight tabular-nums ${s.tone}`}>
                  <AnimatedNumber value={s.value} />
                </p>
              </div>
              <span className={`rounded-lg p-2 ${s.bg} ${s.tone}`}>
                <s.icon className="h-5 w-5 shrink-0" />
              </span>
            </div>
          </motion.div>
        ))}
      </div>


      {/* ── ROW 2: Projektflöde board ── */}
      <motion.div variants={itemVariants}>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Projektflöde</h2>
            <span className="text-xs text-muted-foreground">Konstruktion → Produktion → Montage</span>
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            {projectsByPhase.map(({ phase, projects: phaseProjects }, idx) => {
              const config = phaseConfig[phase];
              const PhaseIcon = config.icon;
              return (
                <motion.div
                  key={phase}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="overflow-hidden rounded-xl border border-border/40"
                  style={{ backgroundColor: `color-mix(in srgb, ${config.accent} 8%, transparent)` }}>
                  <div
                    className="flex items-center justify-between gap-2 px-3 py-2 text-white"
                    style={{ backgroundColor: config.accent }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <PhaseIcon className="h-4 w-4 shrink-0" />
                      <h3 className="font-semibold text-sm truncate">{phase}</h3>
                    </div>
                    <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
                      {phaseProjects.length}
                    </span>
                  </div>

                  <div className="space-y-2 p-3">
                    {phaseProjects.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-foreground italic">Inga projekt i denna fas</p>
                    ) : (
                      phaseProjects.map((p, i) => {
                        const acts = p.activities;
                        const done = acts.filter((a) => a.status === 'Slutförd').length;
                        const total = acts.length;
                        const progress = total > 0 ? Math.round((done / total) * 100) : 0;
                        const delayed = acts.filter((a) => a.status === 'Försenad').length;
                        const risk = acts.filter((a) => a.status === 'Risk för försening').length;
                        return (
                          <motion.div
                            key={p.id}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="rounded-lg border border-border/40 bg-card px-3 py-2.5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 border-l-4"
                            style={{ borderLeftColor: config.accent }}>
                            <p className="text-[11px] font-medium text-muted-foreground tabular-nums">{p.code}</p>
                            <p className="text-sm font-bold truncate" title={p.name}>{p.name}</p>

                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: config.accent }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                  transition={{ duration: 0.7, ease: 'easeOut' }} />
                              </div>
                              <span className="text-[11px] font-semibold tabular-nums shrink-0" style={{ color: config.accent }}>
                                {progress}%
                              </span>
                            </div>

                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-status-completed/15 px-2 py-0.5 text-[10px] font-medium text-status-completed tabular-nums">
                                <Check className="h-3 w-3" />{done} / {total} klara
                              </span>
                              {delayed > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-status-delayed/15 px-2 py-0.5 text-[10px] font-medium text-status-delayed tabular-nums">
                                  <AlertTriangle className="h-3 w-3" />{delayed} försenad{delayed > 1 ? 'e' : ''}
                                </span>
                              )}
                              {risk > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-status-risk/15 px-2 py-0.5 text-[10px] font-medium text-status-risk tabular-nums">
                                  <Clock className="h-3 w-3" />{risk} i riskzon
                                </span>
                              )}
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>
      </motion.div>

      {/* ── ROW 3: Försenade / I riskzonen — separated, plain ── */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {[
          { title: 'Försenade aktiviteter', items: delayedList, dot: 'bg-status-delayed', text: 'text-status-delayed', empty: 'Inga försenade aktiviteter' },
          { title: 'I riskzonen', items: riskList, dot: 'bg-status-risk', text: 'text-status-risk', empty: 'Inga aktiviteter i riskzonen' },
        ].map((block) => (
          <motion.div key={block.title} variants={itemVariants}>
            <Card className="border-border/50 bg-card/90 h-full flex flex-col overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className={`h-2 w-2 rounded-full ${block.dot}`} />
                  {block.title}
                  <span className="ml-1 text-xs font-normal text-muted-foreground tabular-nums">{block.items.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-0">
                {block.items.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground italic">{block.empty}</p>
                ) : (
                  <div className="divide-y divide-border/30">
                    {block.items.map((a) => {
                      const project = projects.find((p) => p.activities.some((act) => act.id === a.id));
                      return (
                        <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-muted/30 transition-colors">
                          <span className="text-sm font-medium truncate">{a.name}</span>
                          <span className="text-xs text-muted-foreground truncate shrink-0 max-w-[45%]">
                            {project ? `${project.code} – ${project.name}` : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>


      {/* ── ROW 4: Events ── */}
      <div className="grid gap-4 grid-cols-1">


        {/* Events */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/90 h-full flex flex-col overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Senaste händelser
                  </CardTitle>
                  <CardDescription className="text-xs">Ändringar i projekt och prognos</CardDescription>
                </div>
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => setShowAddEvent(true)} className="gap-1 print:hidden">
                    <Plus className="h-3.5 w-3.5" />
                    Lägg till
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {forecastEvents.length === 0 ?
              <p className="text-sm text-muted-foreground text-center italic py-6">Inga händelser ännu.</p> :

              <div className="divide-y divide-border/30">
                  <AnimatePresence>
                    {forecastEvents.slice(0, 10).map((evt, idx) => {
                    const formatDate = (d: string) => {
                      const date = new Date(d);
                      const now = new Date();
                      const diffMs = now.getTime() - date.getTime();
                      const diffMin = Math.floor(diffMs / 60000);
                      if (diffMin < 1) return 'Just nu';
                      if (diffMin < 60) return `${diffMin} min sedan`;
                      const diffH = Math.floor(diffMin / 60);
                      if (diffH < 24) return `${diffH}h sedan`;
                      const diffD = Math.floor(diffH / 24);
                      if (diffD < 7) return `${diffD}d sedan`;
                      return date.toLocaleDateString('sv-SE');
                    };

                    let description = '';
                    let badgeCls = 'bg-muted text-muted-foreground';
                    let badgeText = '';
                    let EventIcon = ArrowUpRight;

                    switch (evt.eventType) {
                      case 'created': {
                        const isOffer = evt.newValue === 'Offert';
                        description = isOffer
                          ? `Ny offert${evt.details ? ` (${evt.details})` : ''}`
                          : `Ny affär tillagd${evt.details ? ` (${evt.details})` : ''}`;
                        badgeText = isOffer ? 'Ny offert' : 'Ny';
                        badgeCls = 'bg-primary/10 text-primary';
                        break;
                      }
                      case 'status_change':
                        description = `${evt.oldValue} → ${evt.newValue}`;
                        badgeText = evt.newValue || 'Ändrad';
                        if (evt.newValue === 'Tagen') badgeCls = 'bg-status-completed/15 text-status-completed';else
                        if (evt.newValue === 'Förlorad') {
                          badgeCls = 'bg-status-delayed/15 text-status-delayed';
                          EventIcon = ArrowDownRight;
                        } else badgeCls = 'bg-primary/10 text-primary';
                        break;
                      case 'month_moved': {
                        const evtYear = new Date(evt.createdAt).getFullYear();
                        const enrich = (v: string | null | undefined) =>
                          v && !/\d{4}/.test(v) ? `${v} ${evtYear}` : (v || '');
                        const oldLabel = enrich(evt.oldValue);
                        const newLabel = enrich(evt.newValue);
                        description = `Flyttad: ${oldLabel} → ${newLabel}`;
                        badgeText = `${oldLabel} → ${newLabel}`;
                        badgeCls = 'bg-status-in-progress/10 text-status-in-progress';
                        break;
                      }

                      case 'deleted':
                        description = `Affär raderad${evt.details ? `: ${evt.details}` : evt.productName ? `: ${evt.productName}` : ''}`;
                        badgeText = 'Borttagen';
                        badgeCls = 'bg-status-delayed/15 text-status-delayed';
                        EventIcon = ArrowDownRight;
                        break;
                      case 'phase_started':
                        description = evt.details || 'Fas startad';
                        badgeText = 'Fas';
                        badgeCls = 'bg-primary/10 text-primary';
                        EventIcon = RefreshCw;
                        break;
                      case 'phase_ended':
                        description = evt.details || 'Fas avslutad';
                        badgeText = 'Fas';
                        badgeCls = 'bg-status-completed/15 text-status-completed';
                        EventIcon = Check;
                        break;
                      case 'custom':
                        description = evt.details || 'Egen händelse';
                        badgeText = 'Info';
                        badgeCls = 'bg-muted text-muted-foreground';
                        EventIcon = MessageSquare;
                        break;
                      default:
                        description = evt.details || 'Ändring';
                        badgeText = 'Ändrad';
                    }

                      return (
                      <motion.div
                        key={evt.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex items-start gap-3 py-3 group">
                        
                          <div className={`rounded-full p-2 ${badgeCls} shrink-0 mt-0.5`}>
                            <EventIcon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium break-words">{evt.projectName}</p>
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{description}</p>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 mt-0.5 ${badgeCls}`}>
                            {badgeText}
                          </span>
                          <div className="text-right shrink-0 min-w-[70px] mt-0.5">
                            <p className="text-xs text-muted-foreground">{formatDate(evt.createdAt)}</p>
                            {evt.changedBy && <p className="text-[10px] text-muted-foreground/50">{evt.changedBy}</p>}
                          </div>
                          <button
                          onClick={() => deleteForecastEvent(evt.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-destructive/10 shrink-0 mt-0.5"
                          title="Ta bort">
                          
                            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        </motion.div>);

                  })}
                  </AnimatePresence>
                </div>
              }
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Admin: Add custom event dialog */}
      <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lägg till händelse</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Projekt / Rubrik</label>
              <Input value={newEventProject} onChange={(e) => setNewEventProject(e.target.value)} placeholder="T.ex. projektnamn eller rubrik" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Beskrivning</label>
              <Textarea value={newEventDetails} onChange={(e) => setNewEventDetails(e.target.value)} placeholder="Vad hände?" rows={4} className="min-h-[100px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEvent(false)}>Avbryt</Button>
            <Button onClick={async () => {
              if (!newEventProject.trim()) return;
              await addCustomEvent({
                eventType: 'custom',
                projectName: newEventProject.trim(),
                details: newEventDetails.trim() || undefined,
              });
              setNewEventProject('');
              setNewEventDetails('');
              setShowAddEvent(false);
            }}>Spara</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>);

}