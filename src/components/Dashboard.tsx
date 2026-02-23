import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  FolderKanban, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Activity,
  Printer,
  HardHat,
  Factory,
  Wrench
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Phase } from '@/data/projectData';

const printSection = (element: HTMLElement | null, title: string) => {
  if (!element) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const styles = Array.from(document.styleSheets)
    .map(sheet => {
      try { return Array.from(sheet.cssRules).map(r => r.cssText).join('\n'); }
      catch { return ''; }
    }).join('\n');
  printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>${styles}
    body { background: white !important; color: black !important; padding: 24px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @media print { body { padding: 0; } }
  </style></head><body>${element.innerHTML}</body></html>`);
  printWindow.document.close();
  printWindow.onload = () => { printWindow.print(); printWindow.close(); };
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

const phaseConfig: Record<Phase, { icon: typeof HardHat; color: string; bg: string }> = {
  'Konstruktion': { icon: HardHat, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  'Produktion': { icon: Factory, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  'Montage': { icon: Wrench, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
};

export function Dashboard() {
  const { projects, monthlyTotals, yearTotal } = useProjectDataContext();
  const printRef = useRef<HTMLDivElement>(null);
  const forecastRef = useRef<HTMLDivElement>(null);
  const phasesRef = useRef<HTMLDivElement>(null);

  // Calculate statistics
  const allActivities = projects.flatMap(p => p.activities);
  const totalActivities = allActivities.length;
  const completedActivities = allActivities.filter(a => a.status === 'Slutförd').length;
  const inProgressActivities = allActivities.filter(a => a.status === 'Pågår').length;
  const warningActivities = allActivities.filter(a => a.hasWarning).length;

  // Projects by phase - based on activities with status "Pågår" and a phase set
  const projectsByPhase = (['Konstruktion', 'Produktion', 'Montage'] as Phase[]).map(phase => {
    const projectsInPhase = projects.filter(p => 
      p.status !== 'Avslutat' &&
      p.activities.some(a => a.phase === phase && a.status === 'Pågår')
    );
    return { phase, projects: projectsInPhase };
  });

  // Chart data
  const chartData = months.map(month => ({
    month,
    value: monthlyTotals[month] || 0,
  }));

  const stats = [
    {
      label: 'Aktiva projekt',
      value: projects.length,
      icon: FolderKanban,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Slutförda aktiviteter',
      value: completedActivities,
      icon: CheckCircle2,
      color: 'text-status-completed',
      bgColor: 'bg-status-completed/10',
    },
    {
      label: 'Pågående aktiviteter',
      value: inProgressActivities,
      icon: Clock,
      color: 'text-status-in-progress',
      bgColor: 'bg-status-in-progress/10',
    },
    {
      label: 'Varningar',
      value: warningActivities,
      icon: AlertTriangle,
      color: 'text-status-delayed',
      bgColor: 'bg-status-delayed/10',
    },
  ];

  const handlePrint = () => {
    window.print();
  };

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
        {stats.map((stat) => (
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
        ))}
      </div>

      {/* Project Phases */}
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
            <div className="grid gap-4 md:grid-cols-3">
              {projectsByPhase.map(({ phase, projects: phaseProjects }) => {
                const config = phaseConfig[phase];
                const PhaseIcon = config.icon;
                return (
                  <Card
                    key={phase}
                    className={`group relative overflow-hidden border-border/50 bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-${phase === 'Konstruktion' ? 'blue' : phase === 'Produktion' ? 'amber' : 'emerald'}-500/10 hover:-translate-y-0.5`}
                  >
                    {/* Top accent bar */}
                    <div className={`absolute inset-x-0 top-0 h-1 ${phase === 'Konstruktion' ? 'bg-blue-500' : phase === 'Produktion' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <CardContent className="p-4 pt-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`rounded-lg p-1.5 ${config.bg}`}>
                          <PhaseIcon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <h3 className="font-semibold text-sm">{phase}</h3>
                        <span className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.bg} ${config.color}`}>
                          {phaseProjects.length} projekt
                        </span>
                      </div>
                      {phaseProjects.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Inga projekt i denna fas</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {phaseProjects.map(p => {
                            const completed = p.activities.filter(a => a.status === 'Slutförd').length;
                            const total = p.activities.length;
                            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                            return (
                              <div
                                key={p.id}
                                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs transition-colors hover:bg-muted/70"
                              >
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${phase === 'Konstruktion' ? 'bg-blue-500' : phase === 'Produktion' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                <span className="font-mono text-[10px] text-muted-foreground">{p.code}</span>
                                <span className="font-medium truncate max-w-[120px]">{p.name}</span>
                                {total > 0 && (
                                  <span className="text-[10px] text-muted-foreground">{progress}%</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
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
            <div ref={forecastRef}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Försäljningsprognos 2026
                  </CardTitle>
                  <CardDescription>Månatlig prognos i MSEK</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => printSection(forecastRef.current, 'Försäljningsprognos 2026')} className="print:hidden h-8 w-8">
                  <Printer className="h-4 w-4" />
                </Button>
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
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
            </div>
          </Card>
        </motion.div>

        {/* Project Status Overview */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/80 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-primary" />
                Projektstatus
              </CardTitle>
              <CardDescription className="text-xs">Alla aktiva projekt</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
              {projects.filter(p => p.status !== 'Avslutat').length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4 px-4">
                  Inga projekt ännu.
                </p>
              ) : (
                <div className="divide-y divide-border/40">
                  {/* Header row */}
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-1.5 text-xs text-muted-foreground font-medium">
                    <span>Projekt</span>
                    <span className="text-center w-20">Aktiviteter</span>
                    <span className="text-right w-16">Framsteg</span>
                  </div>
                  {projects.filter(p => p.status !== 'Avslutat').map((project) => {
                    const completed = project.activities.filter(a => a.status === 'Slutförd').length;
                    const total = project.activities.length;
                    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                    const hasWarning = project.activities.some(a => a.hasWarning);

                    return (
                      <div
                        key={project.id}
                        className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-4 py-1.5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {hasWarning && (
                            <AlertTriangle className="h-3 w-3 text-status-delayed shrink-0" />
                          )}
                          <span className="text-xs font-medium truncate">{project.code} – {project.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground text-center w-20">{completed}/{total}</span>
                        <div className="flex items-center gap-1.5 justify-end w-16">
                          <div className="h-1.5 w-10 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-6 text-right">{progress}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
