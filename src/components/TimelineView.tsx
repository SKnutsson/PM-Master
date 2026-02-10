import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, AlertTriangle, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Status } from '@/data/projectData';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { AddActivityDialog } from './dialogs/AddActivityDialog';
import { EditActivityDialog } from './dialogs/EditActivityDialog';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

type ViewMode = 'weeks' | 'days';

// Generate weeks for the timeline
function generateWeeks(year: number): { weekNum: number; startDate: Date; label: string }[] {
  const weeks: { weekNum: number; startDate: Date; label: string }[] = [];
  const jan1 = new Date(year, 0, 1);
  let current = new Date(jan1);
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

// Generate days for a range
function generateDays(startDate: Date, count: number): { date: Date; label: string; dayOfWeek: number }[] {
  const days: { date: Date; label: string; dayOfWeek: number }[] = [];
  const current = new Date(startDate);
  for (let i = 0; i < count; i++) {
    days.push({
      date: new Date(current),
      label: current.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }),
      dayOfWeek: current.getDay(),
    });
    current.setDate(current.getDate() + 1);
  }
  return days;
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
  const { projects: allProjects } = useProjectDataContext();
  const projects = allProjects.filter(p => p.status !== 'Avslutat');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('weeks');
  const weeks = useMemo(() => generateWeeks(2026), []);

  const baseWeekIndex = 4;
  const visibleWeeks = 16;
  const visibleDays = 28; // 4 weeks of days

  const startIndex = Math.max(0, baseWeekIndex + currentWeekOffset);
  const endIndex = Math.min(weeks.length, startIndex + visibleWeeks);
  const displayedWeeks = weeks.slice(startIndex, endIndex);

  // For day view, generate days starting from the first displayed week
  const displayedDays = useMemo(() => {
    if (viewMode !== 'days' || displayedWeeks.length === 0) return [];
    return generateDays(displayedWeeks[0].startDate, visibleDays);
  }, [viewMode, displayedWeeks, visibleDays]);

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedProjects(new Set(timelineProjects.map(p => p.id)));
  };

  const collapseAll = () => {
    setExpandedProjects(new Set());
  };

  const timelineProjects = projects.filter(p =>
    p.activities.some(a => a.startDate || a.endDate)
  );

  const getWeekNumber = (dateStr: string): number => {
    const date = new Date(dateStr);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  };

  const getDayIndex = (dateStr: string): string => {
    return new Date(dateStr).toISOString().split('T')[0];
  };

  // Get overall project time range for collapsed bar
  const getProjectRange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return { startWeek: null, endWeek: null };
    let minWeek = Infinity;
    let maxWeek = -Infinity;
    project.activities.forEach(a => {
      if (a.startDate) minWeek = Math.min(minWeek, getWeekNumber(a.startDate));
      if (a.endDate) maxWeek = Math.max(maxWeek, getWeekNumber(a.endDate));
    });
    return {
      startWeek: minWeek === Infinity ? null : minWeek,
      endWeek: maxWeek === -Infinity ? null : maxWeek,
    };
  };

  const getProjectDayRange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return { startDay: null, endDay: null };
    let minDay: string | null = null;
    let maxDay: string | null = null;
    project.activities.forEach(a => {
      if (a.startDate && (!minDay || a.startDate < minDay)) minDay = a.startDate;
      if (a.endDate && (!maxDay || a.endDate > maxDay)) maxDay = a.endDate;
    });
    return { startDay: minDay, endDay: maxDay };
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
        <div className="flex items-center gap-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="weeks">Veckor</TabsTrigger>
              <TabsTrigger value="days">Dagar</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expandera alla
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Komprimera alla
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeekOffset(Math.max(-baseWeekIndex, currentWeekOffset - (viewMode === 'days' ? 4 : 8)))}
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
              onClick={() => setCurrentWeekOffset(currentWeekOffset + (viewMode === 'days' ? 4 : 8))}
              disabled={endIndex >= weeks.length}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
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
                  {viewMode === 'weeks' ? (
                    displayedWeeks.map((week) => (
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
                    ))
                  ) : (
                    displayedDays.map((day, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex-1 border-r border-border/30 p-1 text-center text-[10px] font-medium min-w-[32px]',
                          (day.dayOfWeek === 0 || day.dayOfWeek === 6) && 'bg-muted/40'
                        )}
                      >
                        <div>{['Sö', 'Må', 'Ti', 'On', 'To', 'Fr', 'Lö'][day.dayOfWeek]}</div>
                        <div className="text-muted-foreground">
                          {day.date.getDate()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Projects and Activities */}
              {timelineProjects.map((project) => {
                const isExpanded = expandedProjects.has(project.id);
                const { startWeek, endWeek } = getProjectRange(project.id);
                const { startDay, endDay } = getProjectDayRange(project.id);
                const activityCount = project.activities.filter(a => a.startDate || a.endDate).length;

                return (
                  <motion.div key={project.id} variants={itemVariants}>
                    {/* Project Header - clickable */}
                    <div
                      className="flex border-b border-border/50 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleProject(project.id)}
                    >
                      <div className="w-72 shrink-0 border-r border-border/50 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronUp className="h-4 w-4 text-muted-foreground rotate-180" />
                          )}
                          <span className="font-semibold">{project.code} - {project.name}</span>
                          {!isExpanded && (
                            <span className="text-xs text-muted-foreground">({activityCount})</span>
                          )}
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <AddActivityDialog
                            projectId={project.id}
                            trigger={
                              <Button size="icon" variant="ghost" className="h-6 w-6">
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                        </div>
                      </div>
                      {/* Collapsed summary bar */}
                      {!isExpanded && (
                        <div className="flex flex-1 items-center">
                          {viewMode === 'weeks' ? (
                            displayedWeeks.map((week) => {
                              const isInRange = startWeek !== null && endWeek !== null &&
                                week.weekNum >= startWeek && week.weekNum <= endWeek;
                              const isStart = week.weekNum === startWeek;
                              const isEnd = week.weekNum === endWeek;
                              return (
                                <div key={week.weekNum} className="flex-1 h-8 flex items-center justify-center border-r border-border/30">
                                  {isInRange && (
                                    <div className={cn(
                                      'h-5 w-full bg-primary/40',
                                      isStart && 'rounded-l ml-1',
                                      isEnd && 'rounded-r mr-1'
                                    )} />
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            displayedDays.map((day, i) => {
                              const dayStr = day.date.toISOString().split('T')[0];
                              const isInRange = startDay && endDay && dayStr >= startDay && dayStr <= endDay;
                              const isStart = dayStr === startDay;
                              const isEnd = dayStr === endDay;
                              return (
                                <div key={i} className={cn(
                                  'flex-1 h-8 flex items-center justify-center border-r border-border/30 min-w-[32px]',
                                  (day.dayOfWeek === 0 || day.dayOfWeek === 6) && 'bg-muted/40'
                                )}>
                                  {isInRange && (
                                    <div className={cn(
                                      'h-5 w-full bg-primary/40',
                                      isStart && 'rounded-l ml-1',
                                      isEnd && 'rounded-r mr-1'
                                    )} />
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                      {isExpanded && <div className="flex-1" />}
                    </div>

                    {/* Activities - shown when expanded */}
                    <AnimatePresence>
                      {isExpanded && project.activities.filter(a => a.startDate || a.endDate).map((activity) => {
                        const actStartWeek = activity.startDate ? getWeekNumber(activity.startDate) : null;
                        const actEndWeek = activity.endDate ? getWeekNumber(activity.endDate) : actStartWeek;
                        const actStartDay = activity.startDate ? getDayIndex(activity.startDate) : null;
                        const actEndDay = activity.endDate ? getDayIndex(activity.endDate) : actStartDay;

                        return (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex border-b border-border/30 hover:bg-muted/20 group"
                          >
                            <div className="w-72 shrink-0 border-r border-border/50 p-2 pl-10 flex items-center justify-between">
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
                              {viewMode === 'weeks' ? (
                                displayedWeeks.map((week) => {
                                  const isInRange = actStartWeek && actEndWeek &&
                                    week.weekNum >= actStartWeek && week.weekNum <= actEndWeek;
                                  const isStart = week.weekNum === actStartWeek;
                                  const isEnd = week.weekNum === actEndWeek;
                                  return (
                                    <div
                                      key={week.weekNum}
                                      className={cn(
                                        'flex-1 h-8 flex items-center justify-center border-r border-border/30',
                                        week.weekNum === baseWeekIndex + 1 && 'bg-primary/5'
                                      )}
                                    >
                                      {isInRange && (
                                        <div className={cn(
                                          'h-5 w-full',
                                          getStatusColor(activity.status),
                                          isStart && 'rounded-l ml-1',
                                          isEnd && 'rounded-r mr-1',
                                          activity.hasWarning && 'animate-pulse'
                                        )} />
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                displayedDays.map((day, i) => {
                                  const dayStr = day.date.toISOString().split('T')[0];
                                  const isInRange = actStartDay && actEndDay && dayStr >= actStartDay && dayStr <= actEndDay;
                                  const isStart = dayStr === actStartDay;
                                  const isEnd = dayStr === actEndDay;
                                  return (
                                    <div
                                      key={i}
                                      className={cn(
                                        'flex-1 h-8 flex items-center justify-center border-r border-border/30 min-w-[32px]',
                                        (day.dayOfWeek === 0 || day.dayOfWeek === 6) && 'bg-muted/40'
                                      )}
                                    >
                                      {isInRange && (
                                        <div className={cn(
                                          'h-5 w-full',
                                          getStatusColor(activity.status),
                                          isStart && 'rounded-l ml-1',
                                          isEnd && 'rounded-r mr-1',
                                          activity.hasWarning && 'animate-pulse'
                                        )} />
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

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
