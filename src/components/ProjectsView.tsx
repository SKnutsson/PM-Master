import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, AlertTriangle, Calendar, User, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Project, Activity } from '@/data/projectData';
import { StatusBadge } from './StatusBadge';
import { AddProjectDialog } from './dialogs/AddProjectDialog';
import { AddActivityDialog } from './dialogs/AddActivityDialog';
import { EditActivityDialog } from './dialogs/EditActivityDialog';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

interface ProjectCardProps {
  project: Project;
  onDeleteProject: (projectId: string) => void;
}

function ProjectCard({ project, onDeleteProject }: ProjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const completed = project.activities.filter(a => a.status === 'Slutförd').length;
  const total = project.activities.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const hasWarning = project.activities.some(a => a.hasWarning);
  const inProgress = project.activities.filter(a => a.status === 'Pågår').length;

  const handleDeleteProject = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Är du säker på att du vill ta bort projektet "${project.code} - ${project.name}"?`)) {
      onDeleteProject(project.id);
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <Card className="border-border/50 bg-card/80 overflow-hidden transition-all hover:border-primary/30">
        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-3 text-left"
            >
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition-colors',
                hasWarning ? 'bg-status-delayed/20 text-status-delayed' : 'bg-primary/20 text-primary'
              )}>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  {project.code} - {project.name}
                </CardTitle>
                <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{total} aktiviteter</span>
                  {inProgress > 0 && (
                    <span className="text-status-in-progress">{inProgress} pågår</span>
                  )}
                  {hasWarning && (
                    <span className="flex items-center gap-1 text-status-delayed">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Varning
                    </span>
                  )}
                </div>
              </div>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold">{progress}%</p>
                <p className="text-xs text-muted-foreground">Klart</p>
              </div>
              <div className="h-12 w-12">
                <svg className="h-12 w-12 -rotate-90 transform">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="hsl(var(--muted))"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="hsl(var(--primary))"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${progress * 1.26} 126`}
                  />
                </svg>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleDeleteProject}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Activities */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="border-t border-border/50 pt-4">
                <div className="mb-3 flex justify-end">
                  <AddActivityDialog projectId={project.id} />
                </div>
                <div className="space-y-2">
                  {project.activities.map((activity, index) => (
                    <ActivityRow 
                      key={activity.id} 
                      activity={activity} 
                      projectId={project.id}
                      index={index} 
                    />
                  ))}
                  {project.activities.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      Inga aktiviteter ännu. Klicka på "Lägg till aktivitet" för att börja.
                    </p>
                  )}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

interface ActivityRowProps {
  activity: Activity;
  projectId: string;
  index: number;
}

function ActivityRow({ activity, projectId, index }: ActivityRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        'flex items-center justify-between rounded-lg border border-border/30 p-3 transition-colors hover:bg-muted/30',
        activity.hasWarning && 'border-status-delayed/30 bg-status-delayed/5'
      )}
    >
      <div className="flex items-center gap-3">
        {activity.hasWarning && (
          <AlertTriangle className="h-4 w-4 text-status-delayed" />
        )}
        <div>
          <p className="font-medium">{activity.name}</p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {activity.department}
              </span>
            </span>
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {activity.responsible}
            </span>
            {activity.startDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {activity.startDate}
                {activity.endDate && activity.endDate !== activity.startDate && ` → ${activity.endDate}`}
              </span>
            )}
            {activity.days && (
              <span className="text-xs">({activity.days} dagar)</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <StatusBadge status={activity.status} size="sm" />
        <EditActivityDialog projectId={projectId} activity={activity} />
      </div>
    </motion.div>
  );
}

export function ProjectsView() {
  const { projects, deleteProject } = useProjectDataContext();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projekt</h1>
          <p className="text-muted-foreground">Hantera och följ upp alla projekt</p>
        </div>
        <AddProjectDialog />
      </div>

      <div className="space-y-4">
        {projects.map((project) => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            onDeleteProject={deleteProject}
          />
        ))}
        {projects.length === 0 && (
          <Card className="border-border/50 bg-card/80 p-8 text-center">
            <p className="text-muted-foreground">Inga projekt ännu. Klicka på "Nytt projekt" för att börja.</p>
          </Card>
        )}
      </div>
    </motion.div>
  );
}
