import { motion } from 'framer-motion';
import { 
  FolderKanban, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { DashboardForecastTables } from './DashboardForecastTables';



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
  const { projects } = useProjectDataContext();

  // Calculate statistics
  const allActivities = projects.flatMap(p => p.activities);
  const totalActivities = allActivities.length;
  const completedActivities = allActivities.filter(a => a.status === 'Slutförd').length;
  const inProgressActivities = allActivities.filter(a => a.status === 'Pågår').length;
  const warningActivities = allActivities.filter(a => a.hasWarning).length;
  
  const completionRate = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

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

      {/* Forecast Tables */}
      <DashboardForecastTables />

      {/* Project Status Overview */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Projektstatus
            </CardTitle>
            <CardDescription>Senaste aktiviteter och varningar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Completion Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total framgång</span>
                <span className="font-medium">{completionRate}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full gradient-success"
                />
              </div>
            </div>

            {/* Project List */}
            <div className="space-y-3 pt-4">
              {projects.slice(0, 5).map((project) => {
                const completed = project.activities.filter(a => a.status === 'Slutförd').length;
                const total = project.activities.length;
                const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                const hasWarning = project.activities.some(a => a.hasWarning);

                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {hasWarning && (
                        <AlertTriangle className="h-4 w-4 text-status-delayed" />
                      )}
                      <div>
                        <p className="font-medium">{project.code} - {project.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {completed}/{total} aktiviteter
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{progress}%</span>
                    </div>
                  </div>
                );
              })}
              {projects.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Inga projekt ännu. Gå till Projekt-vyn för att lägga till projekt.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
