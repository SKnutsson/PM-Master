import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, AlertTriangle, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Status } from '@/data/projectData';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { AddActivityDialog } from './dialogs/AddActivityDialog';
import { EditActivityDialog } from './dialogs/EditActivityDialog';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
};

// Generate weeks for the timeline
function generateWeeks(year: number): { weekNum: number; startDate: Date; label: string }[] {
  const weeks: { weekNum: number; startDate: Date; label: string }[] = [];
  
  // Start from first Monday of January
  const jan1 = new Date(year, 0, 1);
  let current = new Date(jan1);
  
  // Find first Monday
  while (current.getDay() !== 1) {
    current.setDate(current.getDate() + 1);
  }
  
  for (let i = 1; i <= 52; i++) {
    weeks.push({
      weekNum: i,
      startDate: new Date(current),
      label: `V${i}`,
    });
    current.setDate(current.getDate() + 7);
  }
  
  return weeks;
}

const getStatusColor = (status: Status) => {
  switch (status) {
    case 'Slutförd': return 'bg-status-completed';
    case 'Pågår': return 'bg-status-in-progress';
    case 'Försenad': return 'bg-status-delayed';
    default: return 'bg-muted-foreground/30';
  }
};

export function TimelineView() {
  const { projects } = useProjectDataContext();
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const weeks = useMemo(() => generateWeeks(2026), []);
  
  // Calculate current week index (approximately January 27, 2026 = Week 5)
  const baseWeekIndex = 4; // Week 5 (0-indexed)
  const visibleWeeks = 16;
  
  const startIndex = Math.max(0, baseWeekIndex + currentWeekOffset);
  const endIndex = Math.min(weeks.length, startIndex + visibleWeeks);
  const displayedWeeks = weeks.slice(startIndex, endIndex);

  // Get all activities with dates for the timeline
  const timelineProjects = projects.filter(p => 
    p.activities.some(a => a.startDate || a.endDate)
  );

  const getWeekNumber = (dateStr: string): number => {
    const date = new Date(dateStr);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tidslinje</h1>
          <p className="text-muted-foreground">Ganttschema för projektaktiviteter</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentWeekOffset(Math.max(-baseWeekIndex, currentWeekOffset - 8))}
            disabled={startIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            {displayedWeeks[0]?.label} - {displayedWeeks[displayedWeeks.length - 1]?.label}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentWeekOffset(currentWeekOffset + 8)}
            disabled={endIndex >= weeks.length}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-border/50 bg-card/80 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              {/* Header */}
              <div className="sticky top-0 z-10 flex border-b border-border/50 bg-card">
                <div className="w-72 shrink-0 border-r border-border/50 p-3 font-semibold">
                  Projekt / Aktivitet
                </div>
                <div className="flex flex-1">
                  {displayedWeeks.map((week) => (
                    <div
                      key={week.weekNum}
                      className={cn(
                        'flex-1 border-r border-border/30 p-2 text-center text-xs font-medium',
                        week.weekNum === baseWeekIndex + 1 && 'bg-primary/10'
                      )}
                    >
                      <div>{week.label}</div>
                      <div className="text-muted-foreground">
                        {week.startDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Projects and Activities */}
              {timelineProjects.map((project) => (
                <motion.div key={project.id} variants={itemVariants}>
                  {/* Project Header */}
                  <div className="flex border-b border-border/50 bg-muted/30">
                    <div className="w-72 shrink-0 border-r border-border/50 p-3 flex items-center justify-between">
                      <span className="font-semibold">{project.code} - {project.name}</span>
                      <AddActivityDialog 
                        projectId={project.id} 
                        trigger={
                          <Button size="icon" variant="ghost" className="h-6 w-6">
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                    </div>
                    <div className="flex-1" />
                  </div>

                  {/* Activities */}
                  {project.activities.filter(a => a.startDate || a.endDate).map((activity) => {
                    const startWeek = activity.startDate ? getWeekNumber(activity.startDate) : null;
                    const endWeek = activity.endDate ? getWeekNumber(activity.endDate) : startWeek;

                    return (
                      <div key={activity.id} className="flex border-b border-border/30 hover:bg-muted/20 group">
                        <div className="w-72 shrink-0 border-r border-border/50 p-2 pl-6 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              {activity.hasWarning && (
                                <AlertTriangle className="h-3.5 w-3.5 text-status-delayed" />
                              )}
                              <span className="text-sm">{activity.name}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {activity.responsible} • {activity.department}
                            </div>
                          </div>
                          <EditActivityDialog 
                            projectId={project.id} 
                            activity={activity}
                            trigger={
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <span className="sr-only">Redigera</span>
                                ✏️
                              </Button>
                            }
                          />
                        </div>
                        <div className="flex flex-1 items-center">
                          {displayedWeeks.map((week) => {
                            const isInRange = startWeek && endWeek &&
                              week.weekNum >= startWeek && week.weekNum <= endWeek;
                            const isStart = week.weekNum === startWeek;
                            const isEnd = week.weekNum === endWeek;

                            return (
                              <div
                                key={week.weekNum}
                                className={cn(
                                  'flex-1 h-8 flex items-center justify-center border-r border-border/30',
                                  week.weekNum === baseWeekIndex + 1 && 'bg-primary/5'
                                )}
                              >
                                {isInRange && (
                                  <div
                                    className={cn(
                                      'h-5 w-full',
                                      getStatusColor(activity.status),
                                      isStart && 'rounded-l ml-1',
                                      isEnd && 'rounded-r mr-1',
                                      activity.hasWarning && 'animate-pulse'
                                    )}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              ))}

              {timelineProjects.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  Inga aktiviteter med datum. Lägg till aktiviteter med start- och slutdatum för att se dem här.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-6 rounded bg-status-completed" />
          <span>Slutförd</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-6 rounded bg-status-in-progress" />
          <span>Pågår</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-6 rounded bg-muted-foreground/30" />
          <span>Ej påbörjad</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-6 animate-pulse rounded bg-status-delayed" />
          <span>Varning</span>
        </div>
      </div>
    </motion.div>
  );
}
