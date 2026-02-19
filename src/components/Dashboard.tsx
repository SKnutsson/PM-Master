import { motion } from 'framer-motion';
import { 
  FolderKanban, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { StatusBadge } from './StatusBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

export function Dashboard() {
  const { projects, monthlyTotals, yearTotal } = useProjectDataContext();

  // Calculate statistics
  const allActivities = projects.flatMap(p => p.activities);
  const totalActivities = allActivities.length;
  const completedActivities = allActivities.filter(a => a.status === 'Slutförd').length;
  const inProgressActivities = allActivities.filter(a => a.status === 'Pågår').length;
  const warningActivities = allActivities.filter(a => a.hasWarning).length;
  
  const completionRate = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Översikt</h1>
        <p className="text-muted-foreground">Välkommen till projektledningssystemet</p>
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

      {/* Charts and Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Forecast Chart */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
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
