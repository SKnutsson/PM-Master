import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban,
  ChevronDown,
  Clock,
  AlertTriangle,
  Printer,
  Monitor,
  Factory,
  Wrench,
  Check,
  ChartNoAxesColumnIncreasing,
  X,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  MapPin,
  Plus,
  RefreshCw,
  MessageSquare,
  Users } from
'lucide-react';
import { ProjectMap } from './ProjectMap';
import { YearNavigator } from './YearNavigator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
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
  const [resourceSummary, setResourceSummary] = useState<{activeThisWeek: number; weekHours: number; activeInstallers: {name: string; company: string; projects: string[]}[]}>({
    activeThisWeek: 0, weekHours: 0, activeInstallers: []
  });
  const [showResourceList, setShowResourceList] = useState(false);

  // Check admin status + load resource summary
  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));

    // Load resource summary
    const loadResourceSummary = async () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);
      const mondayStr = monday.toISOString().split('T')[0];
      const fridayStr = friday.toISOString().split('T')[0];

      const [installersRes, entriesRes, projectsRes] = await Promise.all([
        supabase.from('installers').select('id, name, company'),
        supabase.from('daily_resource_entries').select('installer_id, project_id, planned_work_hours').gte('date', mondayStr).lte('date', fridayStr),
        supabase.from('projects').select('id, name, code'),
      ]);

      const allInstallers = installersRes.data || [];
      const entries = entriesRes.data || [];
      const allProjects = projectsRes.data || [];
      const projectMap = new Map(allProjects.map(p => [p.id, p.code ? `${p.code} – ${p.name}` : p.name]));
      const activeIds = new Set(entries.map(e => e.installer_id).filter(Boolean));
      const weekHours = entries.reduce((s, e) => s + (e.planned_work_hours || 0), 0);
      
      // Build installer -> projects mapping
      const installerProjects = new Map<string, Set<string>>();
      entries.forEach(e => {
        if (!e.installer_id) return;
        if (!installerProjects.has(e.installer_id)) installerProjects.set(e.installer_id, new Set());
        const pName = projectMap.get(e.project_id);
        if (pName) installerProjects.get(e.installer_id)!.add(pName);
      });

      const activeInstallers = allInstallers
        .filter(i => activeIds.has(i.id))
        .map(i => ({ name: i.name, company: i.company, projects: Array.from(installerProjects.get(i.id) || []) }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setResourceSummary({
        activeThisWeek: activeIds.size,
        weekHours: Math.round(weekHours),
        activeInstallers,
      });
    };
    loadResourceSummary();
  }, [user]);

  const allActivities = projects.flatMap((p) => p.activities);
  const inProgressActivities = allActivities.filter((a) => a.status === 'Pågår').length;
  const delayedActivities = allActivities.filter((a) => a.status === 'Försenad').length;
  const atRiskActivities = allActivities.filter((a) => a.status === 'Risk för försening').length;
  const attentionActivities = allActivities.filter((a) => a.status === 'Försenad' || a.status === 'Risk för försening');
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

      {/* ── ROW 1: Compact Hero Stat Cards ── */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {/* Aktiva projekt — dark petrol */}
        <motion.div variants={itemVariants}>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(168_30%_16%)] to-[hsl(168_40%_10%)] px-4 py-3 shadow-md transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg h-full">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/5 -translate-y-6 translate-x-6" />
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-white/60 uppercase tracking-wider">Aktiva projekt</p>
                <p className="text-3xl font-bold text-white leading-tight tabular-nums">
                  <AnimatedNumber value={activeProjects.length} />
                </p>
              </div>
              <div className="rounded-lg p-2 bg-white/10 backdrop-blur-sm shrink-0">
                <FolderKanban className="h-5 w-5 text-white/80" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Resursöversikt — teal, expandable */}
        <motion.div variants={itemVariants}>
          <div
            className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(160_55%_36%)] to-[hsl(160_50%_24%)] shadow-md transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer h-full"
            onClick={() => setShowResourceList(!showResourceList)}
          >
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/5 -translate-y-6 translate-x-6" />
            <div className="relative z-10 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-white/60 uppercase tracking-wider">Resurser denna vecka</p>
                  <p className="text-3xl font-bold text-white leading-tight tabular-nums">
                    <AnimatedNumber value={resourceSummary.activeThisWeek} />
                    <span className="text-sm font-normal text-white/50 ml-1.5">bokade</span>
                  </p>
                </div>
                <div className={`rounded-lg p-2 bg-white/10 backdrop-blur-sm shrink-0 transition-all ${showResourceList ? 'bg-white/20' : ''}`}>
                  <ChevronDown className={`h-5 w-5 text-white/80 transition-transform duration-200 ${showResourceList ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </div>
            <AnimatePresence>
              {showResourceList && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden relative z-10"
                >
                  <div className="px-4 pb-3 space-y-1">
                    {resourceSummary.activeInstallers.length > 0 ? (
                      resourceSummary.activeInstallers.map((inst, i) => (
                        <div key={i} className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-white/10 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-white truncate">{inst.name}</span>
                            <span className="text-white/40">·</span>
                            <span className="text-white/50 truncate">{inst.company}</span>
                          </div>
                          <span className="text-white/60 text-[11px] ml-2 shrink-0 text-right truncate max-w-[260px]" title={inst.projects.join(', ')}>{inst.projects.join(', ') || '–'}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-white/50 py-2 text-center">Inga montörer planerade denna vecka</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Försenade — red with inline list */}
        <motion.div variants={itemVariants}>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(0_45%_42%)] via-[hsl(20_55%_42%)] to-[hsl(38_75%_45%)] px-4 py-3 shadow-md transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg h-full">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/5 -translate-y-6 translate-x-6" />
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-white/60 uppercase tracking-wider">Försenade & i riskzon</p>
                  <div className="flex items-baseline gap-3 mt-0.5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white leading-none tabular-nums">
                        <AnimatedNumber value={delayedActivities} />
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-white/60">försenade</span>
                    </div>
                    <span className="text-white/30">·</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-white/95 leading-none tabular-nums">
                        <AnimatedNumber value={atRiskActivities} />
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-white/60">i risk</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg p-2 bg-white/10 backdrop-blur-sm shrink-0">
                  <AlertTriangle className="h-5 w-5 text-white/80" />
                </div>
              </div>
              {attentionActivities.length > 0 && (
                <div className="mt-2 space-y-0.5 max-h-28 overflow-y-auto pr-1">
                  {attentionActivities
                    .sort((a, b) => (a.status === 'Försenad' ? -1 : 1) - (b.status === 'Försenad' ? -1 : 1))
                    .map((a, i) => {
                      const project = projects.find((p) => p.activities.some((act) => act.id === a.id));
                      const isDelayed = a.status === 'Försenad';
                      return (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-white/80 leading-snug">
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${isDelayed ? 'bg-white' : 'bg-amber-300'}`}
                            title={isDelayed ? 'Försenad' : 'Risk för försening'}
                          />
                          <span className="truncate">
                            {a.name}{project ? ` – ${project.code} ${project.name}` : ''}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Försäljningsöversikt + Måluppfyllnad flyttade till CRM Dashboard */}

      {/* ── ROW 3: Phase Cards — sequential with arrows, grid aligned with row 1 ── */}
      <motion.div variants={itemVariants}>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {projectsByPhase.map(({ phase, projects: phaseProjects }, idx) => {
            const config = phaseConfig[phase];
            const PhaseIcon = config.icon;
            const isLast = idx === projectsByPhase.length - 1;

            return (
              <motion.div
                key={phase}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.08, type: 'spring' as const, stiffness: 300, damping: 26 }}
                className="relative rounded-xl overflow-visible shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group border border-border/30 flex flex-col">

                {/* Phase header */}
                <div className={`${config.bg} px-5 py-4 relative overflow-hidden rounded-t-xl`}>
                  <div className="absolute inset-0 opacity-[0.08]" style={{
                    backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.4) 0%, transparent 60%)'
                  }} />
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="rounded-lg p-2.5 bg-white/15 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                      <PhaseIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Fas {idx + 1}</span>
                      </div>
                      <h3 className="font-bold text-white text-xl">{phase}</h3>
                      <p className="text-white/50 text-sm">
                        <AnimatedNumber value={phaseProjects.length} /> projekt
                      </p>
                    </div>
                  </div>
                </div>

                {/* Project list */}
                <div className="bg-card px-4 py-3 flex-1 rounded-b-xl">
                  {phaseProjects.length === 0 ?
                  <p className="text-sm text-muted-foreground py-3 text-center italic">Inga pågående projekt</p> :

                  <div className="space-y-1">
                    {phaseProjects.map((p, i) =>
                    <Tooltip key={p.id} delayDuration={200}>
                      <TooltipTrigger asChild>
                        <motion.div
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="rounded-lg px-3 py-2 text-sm cursor-default transition-all hover:bg-muted/50 border border-transparent hover:border-border/40">

                              <span className="font-semibold text-foreground/60">{p.code}</span>
                              <span className="text-muted-foreground mx-2">–</span>
                              <span className="font-semibold text-secondary-foreground">{p.name}</span>
                            </motion.div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.customer}</p>
                      </TooltipContent>
                    </Tooltip>
                    )}
                    </div>
                  }
                </div>

                {/* Arrow overlay positioned in the grid gap so card widths stay equal */}
                {!isLast && (
                  <div
                    className="hidden sm:flex items-center justify-center absolute top-1/2 -translate-y-1/2 -right-[18px] z-10 pointer-events-none bg-background rounded-full"
                    aria-hidden
                  >
                    <ArrowRight className="h-6 w-6 text-primary/70" strokeWidth={2.5} />
                  </div>
                )}
              </motion.div>);

          })}
        </div>
      </motion.div>

      {/* ── Project map ── */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/50 bg-card/90 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-primary" />
              Projektkarta
            </CardTitle>
            <CardDescription className="text-xs">Geografisk översikt av alla projekt</CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectMap projects={activeProjects} height={380} />
          </CardContent>
        </Card>
      </motion.div>

      {/* ── ROW 4: Project Status + Events — side by side ── */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Project Status */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/90 h-full flex flex-col overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Check className="h-4 w-4 text-primary" />
                Projektstatus
              </CardTitle>
              <CardDescription className="text-xs">Framsteg per aktivt projekt</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
              {activeProjects.length === 0 ?
              <p className="text-center text-sm text-muted-foreground py-6 px-4">Inga projekt ännu.</p> :

              <div className="divide-y divide-border/30">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-5 py-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    <span>Projekt</span>
                    <span className="text-center w-20">Aktiviteter</span>
                    <span className="text-right w-24">Framsteg</span>
                  </div>
                  {activeProjects.
                map((project) => {
                  const completed = project.activities.filter((a) => a.status === 'Slutförd').length;
                  const total = project.activities.length;
                  const progress = total > 0 ? Math.round(completed / total * 100) : 0;
                  return { project, completed, total, progress };
                }).
                sort((a, b) => b.progress - a.progress).
                map(({ project, completed, total, progress }) => {
                  const hasWarning = project.activities.some((a) => a.hasWarning);
                  return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-5 py-2.5 hover:bg-muted/30 transition-colors cursor-default">
                      
                          <div className="flex items-center gap-2 min-w-0">
                            {hasWarning && <AlertTriangle className="h-3.5 w-3.5 text-status-delayed shrink-0" />}
                            <span className="text-sm font-medium truncate">{project.code} – {project.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground text-center w-20">{completed}/{total}</span>
                          <div className="flex items-center gap-2 justify-end w-24">
                            <div className="h-2 w-14 overflow-hidden rounded-full bg-muted">
                              <motion.div
                            className="h-full bg-primary rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }} />
                          
                            </div>
                            <span className="text-sm font-semibold w-8 text-right">{progress}%</span>
                          </div>
                        </motion.div>);

                })}
                </div>
              }
            </CardContent>
          </Card>
        </motion.div>

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