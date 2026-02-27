import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,


  Printer,
  HardHat,
  Factory,
  Wrench, Check, ChartNoAxesColumnIncreasing } from
'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Phase } from '@/data/projectData';
import { Progress } from '@/components/ui/progress';

const printSection = (element: HTMLElement | null, title: string) => {
  if (!element) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const styles = Array.from(document.styleSheets).
  map((sheet) => {
    try {return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');}
    catch {return '';}
  }).join('\n');
  printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>${styles}
    body { background: white !important; color: black !important; padding: 24px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @media print { body { padding: 0; } }
  </style></head><body>${element.innerHTML}</body></html>`);
  printWindow.document.close();
  printWindow.onload = () => {printWindow.print();printWindow.close();};
};
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const phaseConfig: Record<Phase, {icon: typeof HardHat;bg: string;iconBg: string;iconColor: string;}> = {
  'Konstruktion': {
    icon: HardHat,
    bg: 'bg-[#92AE9D]',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  'Produktion': {
    icon: Factory,
    bg: 'bg-[#18323A]',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  'Montage': {
    icon: Wrench,
    bg: 'bg-[#1C7F72]',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  }
};

export function Dashboard() {
  const { projects, monthlyTotals, yearTotal, forecast, salesTargets } = useProjectDataContext();
  const printRef = useRef<HTMLDivElement>(null);
  const forecastRef = useRef<HTMLDivElement>(null);
  const phasesRef = useRef<HTMLDivElement>(null);

  // Calculate statistics
  const allActivities = projects.flatMap((p) => p.activities);
  const totalActivities = allActivities.length;
  const completedActivities = allActivities.filter((a) => a.status === 'Slutförd').length;
  const inProgressActivities = allActivities.filter((a) => a.status === 'Pågår').length;
  const warningActivities = allActivities.filter((a) => a.hasWarning).length;

  // Projects by phase - based on activities with status "Pågår" and a phase set
  const projectsByPhase = (['Konstruktion', 'Produktion', 'Montage'] as Phase[]).map((phase) => {
    const projectsInPhase = projects.filter((p) =>
    p.status !== 'Avslutat' &&
    p.activities.some((a) => a.phase === phase && a.status === 'Pågår')
    );
    return { phase, projects: projectsInPhase };
  });

  // Chart data
  const chartData = months.map((month) => ({
    month,
    value: monthlyTotals[month] || 0
  }));

  const stats = [
  {
    label: 'Aktiva projekt',
    value: projects.filter((p) => p.status !== 'Avslutat').length,
    icon: FolderKanban,
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  },
  {
    label: 'Slutförda aktiviteter',
    value: completedActivities,
    icon: CheckCircle2,
    color: 'text-status-completed',
    bgColor: 'bg-status-completed/10'
  },
  {
    label: 'Pågående aktiviteter',
    value: inProgressActivities,
    icon: Clock,
    color: 'text-status-in-progress',
    bgColor: 'bg-status-in-progress/10'
  },
  {
    label: 'Varningar',
    value: warningActivities,
    icon: AlertTriangle,
    color: 'text-status-delayed',
    bgColor: 'bg-status-delayed/10'
  }];


  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      ref={printRef}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-6 print:p-2">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Översikt</h1>
          <p className="text-muted-foreground">Välkommen till projektledningssystemet</p>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
          <Printer className="mr-2 h-4 w-4" />
          Skriv ut
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) =>
        <motion.div key={stat.label} variants={itemVariants}>
            <Card className="border-border/50 bg-card/80">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`rounded-full p-3 ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Project Phases - Chevron Layout */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/50 bg-card/80">
          <div ref={phasesRef}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Projektfaser</CardTitle>
                <CardDescription className="text-xs">Projekt med pågående aktiviteter i respektive fas</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => printSection(phasesRef.current, 'Projektfaser')} className="print:hidden h-8 w-8">
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
              {projectsByPhase.map(({ phase, projects: phaseProjects }) => {
                  const config = phaseConfig[phase];
                  const PhaseIcon = config.icon;
                  const hasActiveProjects = phaseProjects.length > 0;

                  return (
                    <div
                       key={phase}
                       className="relative rounded-xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">

                    {/* Card solid header */}
                    <div className={`${config.bg} px-5 py-4`}>
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${config.iconBg} backdrop-blur-sm`}>
                          <PhaseIcon className={`h-5 w-5 ${config.iconColor}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white text-2xl text-left">{phase}</h3>
                          <p className="text-white/60 text-sm font-medium">{phaseProjects.length} projekt</p>
                        </div>
                      </div>
                    </div>

                    {/* Project list */}
                    <div className="bg-card px-4 py-3 max-h-[280px] overflow-y-auto">
                      {phaseProjects.length === 0 ?
                        <p className="text-xs text-muted-foreground py-2 text-center italic">Inga pågående projekt</p> :

                        <div className="space-y-1.5">
                          {phaseProjects.map((p) =>
                          <div
                            key={p.id}
                            className="rounded-lg px-3 text-xs cursor-default transition-colors hover:bg-muted/50 border border-transparent hover:border-border/50 py-px">

                              <span className="font-semibold text-foreground/70 text-xs">{p.code}</span>
                              <span className="text-muted-foreground mx-1.5">–</span>
                              <span className="text-foreground">{p.name}</span>
                            </div>
                          )}
                        </div>
                        }
                    </div>
                  </div>);

                })}
            </div>
          </CardContent>
          </div>
        </Card>
      </motion.div>

      {/* Charts and Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Forecast Chart */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/80">
             <div ref={forecastRef} className="relative">
             <Button variant="ghost" size="icon" onClick={() => printSection(forecastRef.current, 'Försäljningsprognos 2026')} className="print:hidden h-8 w-8 absolute top-4 right-4 z-10">
               <Printer className="h-4 w-4" />
             </Button>
             <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ChartNoAxesColumnIncreasing className="h-5 w-5 text-primary" />
                    Försäljningsprognos 2026
                  </CardTitle>
                  <CardDescription>Månatlig prognos i MSEK</CardDescription>
                </div>
               <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{yearTotal.toFixed(1)} MSEK</p>
                  <p className="text-sm text-muted-foreground">Total prognos</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                        dataKey="month"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12} />

                    <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12} />

                    <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }} />

                    <Bar
                        dataKey="value"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]} />

                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
            </div>
          </Card>
        </motion.div>

        {/* Sales Target Progress */}
        {(() => {
          const targetYear = 2026;
          const salesTarget = salesTargets[targetYear] || 0;
          const takenTotal = forecast
            .filter(f => f.dealStatus === 'Tagen')
            .reduce((sum, f) => {
              const yearEntries = (f.monthEntries || []).filter(e => e.year === targetYear);
              return sum + yearEntries.reduce((s, e) => s + e.amount, 0);
            }, 0);
          const pct = salesTarget > 0 ? Math.min((takenTotal / salesTarget) * 100, 100) : 0;

          return salesTarget > 0 ? (
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Card className="border-border/50 bg-card/80">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium">Måluppfyllnad {targetYear}</p>
                      <p className="text-xs text-muted-foreground">Tagna affärer vs försäljningsmål</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color: '#1C7F72' }}>{pct.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">{takenTotal.toFixed(1)} / {salesTarget.toFixed(1)} MSEK</p>
                    </div>
                  </div>
                  <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: '#1C7F72' }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : null;
        })()}

        {/* Project Status Overview */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/80 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Check className="h-4 w-4 text-primary" />
                Projektstatus
              </CardTitle>
              <CardDescription className="text-xs">Alla aktiva projekt</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
              {projects.filter((p) => p.status !== 'Avslutat').length === 0 ?
              <p className="text-center text-sm text-muted-foreground py-4 px-4">
                  Inga projekt ännu.
                </p> :

              <div className="divide-y divide-border/40">
                  {/* Header row */}
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-1.5 text-xs text-muted-foreground font-medium">
                    <span>Projekt</span>
                    <span className="text-center w-20">Aktiviteter</span>
                    <span className="text-right w-16">Framsteg</span>
                  </div>
                  {projects.filter((p) => p.status !== 'Avslutat').
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
                    <div
                      key={project.id}
                      className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-4 py-1.5 hover:bg-muted/30 transition-colors">

                        <div className="flex items-center gap-1.5 min-w-0">
                          {hasWarning &&
                        <AlertTriangle className="h-3 w-3 text-status-delayed shrink-0" />
                        }
                          <span className="text-xs font-medium truncate">{project.code} – {project.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground text-center w-20">{completed}/{total}</span>
                        <div className="flex items-center gap-1.5 justify-end w-16">
                          <div className="h-1.5 w-10 overflow-hidden rounded-full bg-muted">
                            <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${progress}%` }} />

                          </div>
                          <span className="text-xs font-medium w-6 text-right">{progress}%</span>
                        </div>
                      </div>);

                })}
                </div>
              }
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>);

}