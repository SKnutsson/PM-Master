import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban,
  Clock,
  AlertTriangle,
  Printer,
  HardHat,
  Factory,
  Wrench,
  Check,
  ChartNoAxesColumnIncreasing,
  X,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { Phase } from '@/data/projectData';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

const phaseConfig: Record<Phase, { icon: typeof HardHat; gradient: string; iconColor: string }> = {
  Konstruktion: {
    icon: HardHat,
    gradient: 'from-[hsl(160_20%_60%)] to-[hsl(160_25%_45%)]',
    iconColor: 'text-white',
  },
  Produktion: {
    icon: Factory,
    gradient: 'from-[hsl(168_30%_22%)] to-[hsl(168_40%_14%)]',
    iconColor: 'text-white',
  },
  Montage: {
    icon: Wrench,
    gradient: 'from-[hsl(160_55%_40%)] to-[hsl(160_55%_30%)]',
    iconColor: 'text-white',
  },
};

// Animated number counter
function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  return <>{display}</>;
}

const printSection = (element: HTMLElement | null, title: string) => {
  if (!element) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const styles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');
  printWindow.document.write(
    `<!DOCTYPE html><html><head><title>${title}</title><style>${styles}
    body { background: white !important; color: black !important; padding: 24px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @media print { body { padding: 0; } }
  </style></head><body>${element.innerHTML}</body></html>`
  );
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };
};

export function Dashboard() {
  const {
    projects,
    monthlyTotals,
    yearTotal,
    forecast,
    forecastEvents,
    deleteForecastEvent,
    salesTargets,
  } = useProjectDataContext();
  const printRef = useRef<HTMLDivElement>(null);
  const forecastRef = useRef<HTMLDivElement>(null);
  const phasesRef = useRef<HTMLDivElement>(null);
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const allActivities = projects.flatMap((p) => p.activities);
  const inProgressActivities = allActivities.filter((a) => a.status === 'Pågår').length;
  const delayedActivities = allActivities.filter((a) => a.status === 'Försenad').length;
  const activeProjects = projects.filter((p) => p.status !== 'Avslutat');

  const projectsByPhase = (['Konstruktion', 'Produktion', 'Montage'] as Phase[]).map((phase) => {
    const projectsInPhase = projects.filter(
      (p) => p.status !== 'Avslutat' && p.activities.some((a) => a.phase === phase && a.status === 'Pågår')
    );
    return { phase, projects: projectsInPhase };
  });

  const chartData = months.map((month) => ({
    month,
    value: monthlyTotals[month] || 0,
  }));

  const currentMonth = months[new Date().getMonth()];

  const stats = [
    {
      label: 'Aktiva projekt',
      value: activeProjects.length,
      icon: FolderKanban,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
      trend: null as string | null,
    },
    {
      label: 'Pågående aktiviteter',
      value: inProgressActivities,
      icon: Clock,
      color: 'text-status-in-progress',
      bgColor: 'bg-status-in-progress/10',
      borderColor: 'border-status-in-progress/20',
      trend: null,
    },
    {
      label: 'Försenade aktiviteter',
      value: delayedActivities,
      icon: AlertTriangle,
      color: 'text-status-delayed',
      bgColor: 'bg-status-delayed/10',
      borderColor: 'border-status-delayed/20',
      trend: null,
    },
  ];

  const handlePrint = () => window.print();

  // Sales target data
  const targetYear = 2026;
  const salesTarget = salesTargets[targetYear] || 0;
  const takenTotal = forecast
    .filter((f) => f.dealStatus === 'Tagen')
    .reduce((sum, f) => {
      const yearEntries = (f.monthEntries || []).filter((e) => e.year === targetYear);
      return sum + yearEntries.reduce((s, e) => s + e.amount, 0);
    }, 0);
  const pct = salesTarget > 0 ? Math.min((takenTotal / salesTarget) * 100, 100) : 0;

  return (
    <motion.div
      ref={printRef}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-6 print:p-2"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Översikt av alla projekt och aktiviteter</p>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden gap-2">
          <Printer className="h-4 w-4" />
          Skriv ut
        </Button>
      </div>

      {/* Stats Grid — Interactive Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={itemVariants}>
            <Card className={`relative overflow-hidden border ${stat.borderColor} bg-card/80 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group cursor-default`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className="text-4xl font-bold tracking-tight">
                      <AnimatedNumber value={stat.value} />
                    </p>
                  </div>
                  <div className={`rounded-xl p-3.5 ${stat.bgColor} transition-transform duration-300 group-hover:scale-110`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
                {/* Decorative accent bar */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${stat.bgColor} opacity-60`} />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Project Phases */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <div ref={phasesRef}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Projektfaser
                  </CardTitle>
                  <CardDescription className="text-xs">Projekt med pågående aktiviteter</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => printSection(phasesRef.current, 'Projektfaser')} className="print:hidden h-8 w-8">
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
                {projectsByPhase.map(({ phase, projects: phaseProjects }, idx) => {
                  const config = phaseConfig[phase];
                  const PhaseIcon = config.icon;

                  return (
                    <motion.div
                      key={phase}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1, type: 'spring', stiffness: 300, damping: 24 }}
                      className="relative rounded-xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group"
                    >
                      {/* Gradient header */}
                      <div className={`bg-gradient-to-br ${config.gradient} px-5 py-4 relative overflow-hidden`}>
                        {/* Subtle pattern overlay */}
                        <div className="absolute inset-0 opacity-10" style={{
                          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                        }} />
                        <div className="flex items-center gap-3 relative z-10">
                          <div className="rounded-lg p-2 bg-white/15 backdrop-blur-sm transition-transform duration-300 group-hover:rotate-6">
                            <PhaseIcon className={`h-5 w-5 ${config.iconColor}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white text-xl text-left">{phase}</h3>
                            <p className="text-white/60 text-sm font-medium">
                              <AnimatedNumber value={phaseProjects.length} /> projekt
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Project list */}
                      <div className="bg-card px-4 py-3 max-h-[280px] overflow-y-auto">
                        {phaseProjects.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-3 text-center italic">Inga pågående projekt</p>
                        ) : (
                          <div className="space-y-1">
                            {phaseProjects.map((p, i) => (
                              <motion.div
                                key={p.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="rounded-lg px-3 py-1.5 text-xs cursor-default transition-all hover:bg-muted/50 border border-transparent hover:border-border/50"
                              >
                                <span className="font-semibold text-foreground/70 text-xs">{p.code}</span>
                                <span className="text-muted-foreground mx-1.5">–</span>
                                <span className="text-foreground">{p.name}</span>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </div>
        </Card>
      </motion.div>

      {/* Forecast + Target + Status — 3-column row */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        {/* Sales Forecast Chart */}
        <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-1">
          <Card className="border-border/50 bg-card/80 h-full flex flex-col overflow-hidden">
            <div ref={forecastRef} className="relative flex flex-col flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => printSection(forecastRef.current, 'Försäljningsprognos 2026')}
                className="print:hidden h-8 w-8 absolute top-4 right-4 z-10"
              >
                <Printer className="h-4 w-4" />
              </Button>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ChartNoAxesColumnIncreasing className="h-5 w-5 text-primary" />
                      Försäljningsprognos {targetYear}
                    </CardTitle>
                    <CardDescription className="text-xs">Månatlig prognos i MSEK</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {yearTotal.toFixed(1)} <span className="text-sm font-medium text-muted-foreground">MSEK</span>
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} onMouseLeave={() => setHoveredMonth(null)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '10px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                          padding: '8px 12px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                        cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                      />
                      <Bar
                        dataKey="value"
                        radius={[6, 6, 0, 0]}
                        onMouseEnter={(_, idx) => setHoveredMonth(chartData[idx]?.month || null)}
                      >
                        {chartData.map((entry) => (
                          <Cell
                            key={entry.month}
                            fill={
                              entry.month === currentMonth
                                ? 'hsl(var(--primary))'
                                : hoveredMonth === entry.month
                                ? 'hsl(var(--primary) / 0.8)'
                                : 'hsl(var(--primary) / 0.5)'
                            }
                            style={{ transition: 'fill 0.2s ease' }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </div>
          </Card>
        </motion.div>

        {/* Sales Target Progress — Radial style */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/80 h-full flex flex-col overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Måluppfyllnad {targetYear}
              </CardTitle>
              <CardDescription className="text-xs">Tagna affärer vs mål</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center">
              {salesTarget > 0 ? (
                <div className="space-y-4 w-full">
                  {/* Circular progress indicator */}
                  <div className="relative mx-auto w-32 h-32">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 42}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - pct / 100) }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-primary">
                        <AnimatedNumber value={Math.round(pct)} duration={1200} />%
                      </span>
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium">{takenTotal.toFixed(1)} / {salesTarget.toFixed(1)} MSEK</p>
                    <p className="text-xs text-muted-foreground">
                      {pct >= 100 ? (
                        <span className="text-status-completed font-medium">Mål uppnått! 🎉</span>
                      ) : (
                        <>Kvar: {(salesTarget - takenTotal).toFixed(1)} MSEK</>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center italic">Inget försäljningsmål satt</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Project Status Overview */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/80 h-full flex flex-col overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Check className="h-4 w-4 text-primary" />
                Projektstatus
              </CardTitle>
              <CardDescription className="text-xs">Alla aktiva projekt</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
              {activeProjects.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4 px-4">Inga projekt ännu.</p>
              ) : (
                <div className="divide-y divide-border/40">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    <span>Projekt</span>
                    <span className="text-center w-20">Aktiviteter</span>
                    <span className="text-right w-16">Framsteg</span>
                  </div>
                  {activeProjects
                    .map((project) => {
                      const completed = project.activities.filter((a) => a.status === 'Slutförd').length;
                      const total = project.activities.length;
                      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                      return { project, completed, total, progress };
                    })
                    .sort((a, b) => b.progress - a.progress)
                    .map(({ project, completed, total, progress }) => {
                      const hasWarning = project.activities.some((a) => a.hasWarning);
                      return (
                        <motion.div
                          key={project.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-4 py-2 hover:bg-muted/30 transition-colors group cursor-default"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {hasWarning && <AlertTriangle className="h-3 w-3 text-status-delayed shrink-0" />}
                            <span className="text-xs font-medium truncate">{project.code} – {project.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground text-center w-20">{completed}/{total}</span>
                          <div className="flex items-center gap-1.5 justify-end w-16">
                            <div className="h-1.5 w-10 overflow-hidden rounded-full bg-muted">
                              <motion.div
                                className="h-full bg-primary rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                              />
                            </div>
                            <span className="text-xs font-medium w-6 text-right">{progress}%</span>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Events */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Senaste händelser
            </CardTitle>
            <CardDescription className="text-xs">Ändringar i försäljningsprognosen</CardDescription>
          </CardHeader>
          <CardContent>
            {forecastEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center italic py-4">Inga händelser ännu.</p>
            ) : (
              <div className="divide-y divide-border/40">
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
                      case 'created':
                        description = `Ny affär tillagd${evt.details ? ` (${evt.details})` : ''}`;
                        badgeText = 'Ny';
                        badgeCls = 'bg-primary/10 text-primary';
                        EventIcon = ArrowUpRight;
                        break;
                      case 'status_change':
                        description = `Status: ${evt.oldValue} → ${evt.newValue}`;
                        badgeText = evt.newValue || 'Ändrad';
                        if (evt.newValue === 'Tagen') badgeCls = 'bg-status-completed/15 text-status-completed';
                        else if (evt.newValue === 'Förlorad') {
                          badgeCls = 'bg-status-delayed/15 text-status-delayed';
                          EventIcon = ArrowDownRight;
                        } else badgeCls = 'bg-primary/10 text-primary';
                        break;
                      case 'month_moved':
                        description = `Flyttad: ${evt.oldValue} → ${evt.newValue}`;
                        badgeText = 'Flyttad';
                        badgeCls = 'bg-status-in-progress/10 text-status-in-progress';
                        break;
                      case 'deleted':
                        description = 'Affär borttagen';
                        badgeText = 'Borttagen';
                        badgeCls = 'bg-status-delayed/15 text-status-delayed';
                        EventIcon = ArrowDownRight;
                        break;
                      default:
                        description = evt.details || 'Ändring';
                        badgeText = 'Ändrad';
                    }

                    return (
                      <motion.div
                        key={evt.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex items-center gap-3 py-2.5 group"
                      >
                        <div className={`rounded-full p-1.5 ${badgeCls} shrink-0`}>
                          <EventIcon className="h-3 w-3" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{evt.projectName}</p>
                          <p className="text-xs text-muted-foreground truncate">{description}</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${badgeCls}`}>
                          {badgeText}
                        </span>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">{formatDate(evt.createdAt)}</p>
                          {evt.changedBy && <p className="text-[10px] text-muted-foreground/60">{evt.changedBy}</p>}
                        </div>
                        <button
                          onClick={() => deleteForecastEvent(evt.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-destructive/10 shrink-0"
                          title="Ta bort händelse"
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
