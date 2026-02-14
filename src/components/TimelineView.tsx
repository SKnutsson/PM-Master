import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Status } from '@/data/projectData';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { AddActivityDialog } from './dialogs/AddActivityDialog';
import { EditActivityDialog } from './dialogs/EditActivityDialog';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusLegend } from './StatusLegend';
import { GanttBar } from './GanttBar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
};

type ViewMode = 'weeks' | 'days';

type DerivedStatus = 'Ej påbörjat' | 'Pågår' | 'Slutförd' | 'Försenad';

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

function deriveStatus(status: Status, endDate?: string): DerivedStatus {
  if (status === 'Slutförd') return 'Slutförd';
  if (status === 'Försenad') return 'Försenad';
  // Respect explicit "Pågår" – don't auto-override to Försenad
  if (status === 'Pågår') return 'Pågår';
  // Only auto-derive "Försenad" for activities not yet started
  if (endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    if (today > end) return 'Försenad';
  }
  return 'Ej påbörjat';
}

const getStatusColor = (derivedStatus: DerivedStatus) => {
  switch (derivedStatus) {
    case 'Slutförd': return 'bg-status-completed';
    case 'Pågår': return 'bg-status-in-progress';
    case 'Försenad': return 'bg-status-delayed';
    case 'Ej påbörjat': return 'bg-status-not-started';
    default: return 'bg-muted-foreground/30';
  }
};

const getStatusDotColor = (derivedStatus: DerivedStatus) => {
  switch (derivedStatus) {
    case 'Slutförd': return 'bg-status-completed';
    case 'Pågår': return 'bg-status-in-progress';
    case 'Försenad': return 'bg-status-delayed';
    case 'Ej påbörjat': return 'bg-status-not-started';
    default: return 'bg-muted-foreground/30';
  }
};

const statusLabels: { status: DerivedStatus; color: string; label: string }[] = [
  { status: 'Ej påbörjat', color: 'bg-status-not-started', label: 'Ej påbörjat' },
  { status: 'Pågår', color: 'bg-status-in-progress', label: 'Pågår' },
  { status: 'Slutförd', color: 'bg-status-completed', label: 'Slutförd' },
  { status: 'Försenad', color: 'bg-status-delayed', label: 'Försenad' },
];

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function TimelineView() {
  const { projects: allProjects, updateActivity } = useProjectDataContext();
  const projects = allProjects.filter(p => p.status !== 'Avslutat');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('weeks');
  const weeks = useMemo(() => generateWeeks(2026), []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayStr = today.toISOString().split('T')[0];

  const baseWeekIndex = 4;
  const visibleWeeks = 16;
  const visibleDays = 28;

  const startIndex = Math.max(0, baseWeekIndex + currentWeekOffset);
  const endIndex = Math.min(weeks.length, startIndex + visibleWeeks);
  const displayedWeeks = weeks.slice(startIndex, endIndex);

  const displayedDays = useMemo(() => {
    if (viewMode !== 'days' || displayedWeeks.length === 0) return [];
    return generateDays(displayedWeeks[0].startDate, visibleDays);
  }, [viewMode, displayedWeeks, visibleDays]);

  const todayWeekNum = useMemo(() => {
    const startOfYear = new Date(2026, 0, 1);
    const days = Math.floor((today.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  }, [today]);

  const todayDayIndex = useMemo(() => {
    if (viewMode !== 'days') return -1;
    return displayedDays.findIndex(d => d.date.toISOString().split('T')[0] === todayStr);
  }, [viewMode, displayedDays, todayStr]);

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const timelineProjects = projects.filter(p =>
    p.activities.some(a => a.startDate || a.endDate)
  );

  const expandAll = () => {
    setExpandedProjects(new Set(timelineProjects.map(p => p.id)));
  };
  const collapseAll = () => {
    setExpandedProjects(new Set());
  };

  const getWeekNumber = (dateStr: string): number => {
    const date = new Date(dateStr);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  };

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

  // Year header groups for weeks
  const weekYearGroups = useMemo(() => {
    if (viewMode !== 'weeks') return [];
    const groups: { year: number; month: string; span: number }[] = [];
    displayedWeeks.forEach((week) => {
      const y = week.startDate.getFullYear();
      const m = week.startDate.toLocaleDateString('sv-SE', { month: 'short' });
      const label = `${y} • ${m}`;
      if (groups.length > 0 && groups[groups.length - 1].month === label) {
        groups[groups.length - 1].span++;
      } else {
        groups.push({ year: y, month: label, span: 1 });
      }
    });
    return groups;
  }, [viewMode, displayedWeeks]);

  // Year header groups for days
  const dayYearGroups = useMemo(() => {
    if (viewMode !== 'days') return [];
    const groups: { label: string; span: number }[] = [];
    displayedDays.forEach((day) => {
      const y = day.date.getFullYear();
      const m = day.date.toLocaleDateString('sv-SE', { month: 'short' });
      const label = `${y} • ${m}`;
      if (groups.length > 0 && groups[groups.length - 1].label === label) {
        groups[groups.length - 1].span++;
      } else {
        groups.push({ label, span: 1 });
      }
    });
    return groups;
  }, [viewMode, displayedDays]);

  const columnCount = viewMode === 'weeks' ? displayedWeeks.length : displayedDays.length;

  const todayWeekColIndex = useMemo(() => {
    if (viewMode !== 'weeks') return -1;
    return displayedWeeks.findIndex(w => w.weekNum === todayWeekNum);
  }, [viewMode, displayedWeeks, todayWeekNum]);

  const todayColIndex = viewMode === 'weeks' ? todayWeekColIndex : todayDayIndex;

  // --- Drag & drop helpers ---

  // Convert a column index to ISO date string
  const colToDate = useCallback((colIndex: number): string => {
    const idx = Math.round(Math.max(0, colIndex));
    if (viewMode === 'weeks') {
      const weekIdx = Math.min(idx, displayedWeeks.length - 1);
      if (weekIdx < 0 || displayedWeeks.length === 0) return todayStr;
      const d = new Date(displayedWeeks[weekIdx].startDate);
      return toISODate(d);
    } else {
      const dayIdx = Math.min(idx, displayedDays.length - 1);
      if (dayIdx < 0 || displayedDays.length === 0) return todayStr;
      return toISODate(displayedDays[dayIdx].date);
    }
  }, [viewMode, displayedWeeks, displayedDays, todayStr]);

  // Convert ISO date to column index
  const dateToCol = useCallback((dateStr: string): number => {
    if (viewMode === 'weeks') {
      const weekNum = getWeekNumber(dateStr);
      const idx = displayedWeeks.findIndex(w => w.weekNum === weekNum);
      return idx >= 0 ? idx : (weekNum < (displayedWeeks[0]?.weekNum ?? 0) ? -1 : displayedWeeks.length);
    } else {
      const target = dateStr;
      const idx = displayedDays.findIndex(d => toISODate(d.date) === target);
      return idx >= 0 ? idx : (target < toISODate(displayedDays[0]?.date) ? -1 : displayedDays.length);
    }
  }, [viewMode, displayedWeeks, displayedDays]);

  // Handle date changes from drag/resize
  const handleDatesChange = useCallback(async (projectId: string, activityId: string, newStart: string, newEnd: string) => {
    await updateActivity(projectId, activityId, {
      startDate: newStart,
      endDate: newEnd,
    });
  }, [updateActivity]);

  const renderTodayMarker = () => {
    if (todayColIndex < 0 || todayColIndex >= columnCount) return null;
    const leftPercent = ((todayColIndex + 0.5) / columnCount) * 100;
    return (
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-destructive z-20 pointer-events-none"
        style={{ left: `${leftPercent}%` }}
      >
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-destructive" />
      </div>
    );
  };

  // Render background cells for an activity row
  const renderBackgroundCells = () => {
    if (viewMode === 'weeks') {
      return displayedWeeks.map((week) => (
        <div
          key={week.weekNum}
          className={cn(
            'flex-1 h-6 border-r border-border/30',
            week.weekNum === todayWeekNum && 'bg-primary/5'
          )}
        />
      ));
    } else {
      return displayedDays.map((day, i) => (
        <div
          key={i}
          className={cn(
            'flex-1 h-6 border-r border-border/30 min-w-[28px]',
            (day.dayOfWeek === 0 || day.dayOfWeek === 6) && 'bg-muted/40'
          )}
        />
      ));
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-3 p-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tidslinje</h1>
            <p className="text-sm text-muted-foreground">Ganttschema för projektaktiviteter – dra i aktiviteter för att ändra datum</p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="weeks" className="text-xs px-3 h-7">Veckor</TabsTrigger>
                <TabsTrigger value="days" className="text-xs px-3 h-7">Dagar</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={expandAll}>
                Expandera
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={collapseAll}>
                Komprimera
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentWeekOffset(Math.max(-baseWeekIndex, currentWeekOffset - (viewMode === 'days' ? 4 : 8)))}
                disabled={startIndex === 0}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-1">
                {displayedWeeks[0]?.label} – {displayedWeeks[displayedWeeks.length - 1]?.label}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentWeekOffset(currentWeekOffset + (viewMode === 'days' ? 4 : 8))}
                disabled={endIndex >= weeks.length}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <StatusLegend
          items={statusLabels.map(s => ({ color: s.color, label: s.label }))}
          showTodayMarker
        />

        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                {/* Year/Month header row */}
                <div className="sticky top-0 z-10 flex border-b border-border/30 bg-card">
                  <div className="w-60 shrink-0 border-r border-border/50" />
                  <div className="w-16 shrink-0 border-r border-border/50" />
                  <div className="flex flex-1">
                    {viewMode === 'weeks'
                      ? weekYearGroups.map((g, i) => (
                          <div
                            key={i}
                            className="border-r border-border/30 text-center text-[10px] font-semibold text-muted-foreground py-0.5"
                            style={{ flex: g.span }}
                          >
                            {g.month}
                          </div>
                        ))
                      : dayYearGroups.map((g, i) => (
                          <div
                            key={i}
                            className="border-r border-border/30 text-center text-[10px] font-semibold text-muted-foreground py-0.5"
                            style={{ flex: g.span }}
                          >
                            {g.label}
                          </div>
                        ))}
                  </div>
                </div>

                {/* Week/Day header row */}
                <div className="sticky top-[21px] z-10 flex border-b border-border/50 bg-card">
                  <div className="w-60 shrink-0 border-r border-border/50 px-2 py-1 text-xs font-semibold">
                    Projekt / Aktivitet
                  </div>
                  <div className="w-16 shrink-0 border-r border-border/50 px-1 py-1 text-[10px] font-semibold text-muted-foreground">
                    Ansvarig
                  </div>
                  <div className="flex flex-1">
                    {viewMode === 'weeks' ? (
                      displayedWeeks.map((week) => (
                        <div
                          key={week.weekNum}
                          className={cn(
                            'flex-1 border-r border-border/30 py-0.5 text-center text-[10px] font-medium',
                            week.weekNum === todayWeekNum && 'bg-primary/10'
                          )}
                        >
                          <div>{week.label}</div>
                          <div className="text-muted-foreground text-[9px]">
                            {week.startDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                      ))
                    ) : (
                      displayedDays.map((day, i) => (
                        <div
                          key={i}
                          className={cn(
                            'flex-1 border-r border-border/30 py-0.5 text-center text-[9px] font-medium min-w-[28px]',
                            (day.dayOfWeek === 0 || day.dayOfWeek === 6) && 'bg-muted/40',
                            day.date.toISOString().split('T')[0] === todayStr && 'bg-primary/10'
                          )}
                        >
                          <div>{['Sö', 'Må', 'Ti', 'On', 'To', 'Fr', 'Lö'][day.dayOfWeek]}</div>
                          <div className="text-muted-foreground">{day.date.getDate()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Projects and Activities */}
                <div className="relative">
                  {/* Today marker overlay */}
                  <div className="absolute top-0 bottom-0 left-[19rem] right-0 pointer-events-none z-20">
                    {renderTodayMarker()}
                  </div>

                  {timelineProjects.map((project) => {
                    const isExpanded = expandedProjects.has(project.id);
                    const { startWeek, endWeek } = getProjectRange(project.id);
                    const { startDay, endDay } = getProjectDayRange(project.id);
                    const activityCount = project.activities.filter(a => a.startDate || a.endDate).length;

                    return (
                      <motion.div key={project.id} variants={itemVariants}>
                        {/* Project Header */}
                        <div
                          className="flex border-b border-border/50 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleProject(project.id)}
                        >
                          <div className="w-60 shrink-0 border-r border-border/50 px-2 py-1 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isExpanded ? (
                                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronUp className="h-3 w-3 text-muted-foreground rotate-180 shrink-0" />
                              )}
                              <span className="font-semibold text-xs truncate">{project.code} - {project.name}</span>
                              {!isExpanded && (
                                <span className="text-[10px] text-muted-foreground shrink-0">({activityCount})</span>
                              )}
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                              <AddActivityDialog
                                projectId={project.id}
                                trigger={
                                  <Button size="icon" variant="ghost" className="h-5 w-5">
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                }
                              />
                            </div>
                          </div>
                          <div className="w-16 shrink-0 border-r border-border/50" />
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
                                    <div key={week.weekNum} className="flex-1 h-6 flex items-center justify-center border-r border-border/30">
                                      {isInRange && (
                                        <div className={cn(
                                          'h-3.5 w-full bg-primary/40',
                                          isStart && 'rounded-l ml-0.5',
                                          isEnd && 'rounded-r mr-0.5'
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
                                      'flex-1 h-6 flex items-center justify-center border-r border-border/30 min-w-[28px]',
                                      (day.dayOfWeek === 0 || day.dayOfWeek === 6) && 'bg-muted/40'
                                    )}>
                                      {isInRange && (
                                        <div className={cn(
                                          'h-3.5 w-full bg-primary/40',
                                          isStart && 'rounded-l ml-0.5',
                                          isEnd && 'rounded-r mr-0.5'
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

                        {/* Activities */}
                        <AnimatePresence>
                          {isExpanded && project.activities.filter(a => a.startDate || a.endDate).map((activity) => {
                            const derived = deriveStatus(activity.status, activity.endDate);
                            const actStartCol = activity.startDate ? dateToCol(activity.startDate) : -1;
                            const actEndCol = activity.endDate ? dateToCol(activity.endDate) : actStartCol;
                            const barVisible = actStartCol >= 0 && actEndCol >= 0 && actStartCol < columnCount;

                            return (
                              <motion.div
                                key={activity.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex border-b border-border/30 hover:bg-muted/20 group"
                              >
                                <div className="w-60 shrink-0 border-r border-border/50 px-2 py-0.5 pl-7 flex items-center justify-between min-w-0">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="min-w-0 flex items-center gap-1.5">
                                        <div className={cn('h-2 w-2 rounded-full shrink-0', getStatusDotColor(derived))} />
                                        <span className="text-xs truncate">{activity.name}</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="text-xs max-w-xs">
                                      <p className="font-semibold">{activity.name}</p>
                                      <p className="text-muted-foreground">
                                        {activity.startDate} → {activity.endDate}
                                      </p>
                                      <p className="text-muted-foreground">
                                        Status: {derived} • {activity.responsible}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <EditActivityDialog
                                    projectId={project.id}
                                    activity={activity}
                                    trigger={
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                      >
                                        <span className="sr-only">Redigera</span>
                                        ✏️
                                      </Button>
                                    }
                                  />
                                </div>
                                <div className="w-16 shrink-0 border-r border-border/50 px-1 py-0.5 flex items-center">
                                  <span className="text-[9px] text-muted-foreground truncate">{activity.responsible}</span>
                                </div>
                                {/* Grid area with absolute-positioned draggable bar */}
                                <div className="flex flex-1 items-center relative">
                                  {/* Background cells for grid lines */}
                                  {renderBackgroundCells()}
                                  {/* Draggable bar overlay */}
                                  {barVisible && (
                                    <GanttBar
                                      activityId={activity.id}
                                      projectId={project.id}
                                      activityName={activity.name}
                                      startDate={activity.startDate || todayStr}
                                      endDate={activity.endDate || todayStr}
                                      statusColor={getStatusColor(derived)}
                                      derivedStatus={derived}
                                      responsible={activity.responsible}
                                      columnCount={columnCount}
                                      startCol={actStartCol}
                                      endCol={actEndCol}
                                      onDatesChange={handleDatesChange}
                                      colToDate={colToDate}
                                      dateToCol={dateToCol}
                                      snapCols={1}
                                    />
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
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      Inga aktiviteter med datum. Lägg till aktiviteter med start- och slutdatum för att se dem här.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
}
