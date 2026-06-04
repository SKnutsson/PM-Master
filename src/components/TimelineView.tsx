import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Plus, GripVertical, Archive } from 'lucide-react';
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
  TooltipTrigger } from
'@/components/ui/tooltip';
import { toast } from 'sonner';
import { useProfiles, getDisplayName } from '@/hooks/useProfiles';
import { UserAvatar } from '@/components/UserAvatar';

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

type DerivedStatus = 'Ej påbörjad' | 'Pågår' | 'Slutförd' | 'Försenad';

// ISO 8601 week number: week 1 contains the first Thursday of the year
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getISOWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return d.getUTCFullYear();
}

function generateWeeksForRange(startYear: number, endYear: number): {weekNum: number;year: number;startDate: Date;label: string;}[] {
  const weeks: {weekNum: number;year: number;startDate: Date;label: string;}[] = [];
  // Find Monday of ISO week 1 of startYear: the Monday of the week containing Jan 4
  const jan4 = new Date(startYear, 0, 4);
  let current = new Date(jan4);
  current.setDate(current.getDate() - (current.getDay() + 6) % 7); // Go to Monday

  const endLimit = new Date(endYear + 1, 1, 1); // well past end of endYear
  while (current < endLimit) {
    const isoYear = getISOWeekYear(current);
    const isoWeek = getISOWeekNumber(current);
    if (isoYear > endYear) break;
    if (isoYear >= startYear) {
      weeks.push({
        weekNum: isoWeek,
        year: isoYear,
        startDate: new Date(current),
        label: `V${isoWeek}`
      });
    }
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function generateAllDaysForRange(startYear: number, endYear: number): {date: Date;label: string;dayOfWeek: number;}[] {
  const days: {date: Date;label: string;dayOfWeek: number;}[] = [];
  const current = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  while (current <= end) {
    days.push({
      date: new Date(current),
      label: current.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }),
      dayOfWeek: current.getDay()
    });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function deriveStatus(status: Status): DerivedStatus {
  if (status === 'Slutförd') return 'Slutförd';
  if (status === 'Försenad') return 'Försenad';
  if (status === 'Pågår') return 'Pågår';
  return 'Ej påbörjad';
}

const getStatusColor = (derivedStatus: DerivedStatus) => {
  switch (derivedStatus) {
    case 'Slutförd':return 'bg-status-completed';
    case 'Pågår':return 'bg-status-in-progress';
    case 'Försenad':return 'bg-status-delayed';
    case 'Ej påbörjad':return 'bg-status-not-started';
    default:return 'bg-muted-foreground/30';
  }
};

const getStatusDotColor = (derivedStatus: DerivedStatus) => {
  switch (derivedStatus) {
    case 'Slutförd':return 'bg-status-completed';
    case 'Pågår':return 'bg-status-in-progress';
    case 'Försenad':return 'bg-status-delayed';
    case 'Ej påbörjad':return 'bg-status-not-started';
    default:return 'bg-muted-foreground/30';
  }
};

const statusLabels: {status: DerivedStatus;color: string;label: string;}[] = [
{ status: 'Ej påbörjad', color: 'bg-status-not-started', label: 'Ej påbörjad' },
{ status: 'Pågår', color: 'bg-status-in-progress', label: 'Pågår' },
{ status: 'Slutförd', color: 'bg-status-completed', label: 'Slutförd' },
{ status: 'Försenad', color: 'bg-status-delayed', label: 'Försenad' }];


function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Fixed column widths for consistent layout
const WEEK_COL_WIDTH = 56; // px per week column
const DAY_COL_WIDTH = 32; // px per day column
const LEFT_COL_WIDTH = 304; // w-60 + w-16 = 240 + 64

export function TimelineView() {
  const { projects: allProjects, updateActivity, updateProjectOrder, updateActivityOrder } = useProjectDataContext();
  const [showArchived, setShowArchived] = useState(false);
  const projects = useMemo(() => {
    if (showArchived) return allProjects.filter((p) => p.status === 'Avslutat');
    return allProjects.filter((p) => p.status !== 'Avslutat');
  }, [allProjects, showArchived]);
  const { profiles } = useProfiles();
  const [expandedProjects, setExpandedProjects] = useState<Set<string> | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('weeks');

  // Determine year range from activity data
  const { startYear, endYear } = useMemo(() => {
    let minYear = new Date().getFullYear();
    let maxYear = minYear;
    allProjects.forEach((p) => {
      p.activities.forEach((a) => {
        if (a.startDate) {
          const y = parseInt(a.startDate.substring(0, 4), 10);
          if (y < minYear) minYear = y;
          if (y > maxYear) maxYear = y;
        }
        if (a.endDate) {
          const y = parseInt(a.endDate.substring(0, 4), 10);
          if (y < minYear) minYear = y;
          if (y > maxYear) maxYear = y;
        }
      });
    });
    return { startYear: minYear, endYear: maxYear };
  }, [allProjects]);

  const weeks = useMemo(() => generateWeeksForRange(startYear, endYear), [startYear, endYear]);
  const allDays = useMemo(() => generateAllDaysForRange(startYear, endYear), [startYear, endYear]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayStr = toISODate(today);

  const displayedWeeks = weeks;
  const displayedDays = allDays;

  const todayWeekIndex = useMemo(() => {
    const todayDate = toISODate(today);
    for (let i = 0; i < weeks.length; i++) {
      const wStart = toISODate(weeks[i].startDate);
      const wEnd = new Date(weeks[i].startDate);
      wEnd.setDate(wEnd.getDate() + 6);
      const wEndStr = toISODate(wEnd);
      if (todayDate >= wStart && todayDate <= wEndStr) return i;
    }
    return -1;
  }, [today, weeks]);

  const todayDayIndex = useMemo(() => {
    if (viewMode !== 'days') return -1;
    return displayedDays.findIndex((d) => toISODate(d.date) === todayStr);
  }, [viewMode, displayedDays, todayStr]);

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(projectId)) next.delete(projectId); else next.add(projectId);
      return next;
    });
  };

  const timelineProjects = useMemo(() => projects, [projects]);

  // --- Project drag-and-drop reorder state ---
  const [dragProjectId, setDragProjectId] = useState<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const [localProjectOrder, setLocalProjectOrder] = useState<string[]>([]);

  // Keep local order in sync with data
  useEffect(() => {
    const ids = timelineProjects.map((p) => p.id);
    setLocalProjectOrder((prev) => {
      if (prev.length === ids.length && prev.every((id, i) => id === ids[i])) return prev;
      return ids;
    });
  }, [timelineProjects]);

  const orderedProjects = useMemo(() => {
    if (localProjectOrder.length === 0) return timelineProjects;
    const map = new Map(timelineProjects.map((p) => [p.id, p]));
    return localProjectOrder.map((id) => map.get(id)).filter(Boolean) as typeof timelineProjects;
  }, [localProjectOrder, timelineProjects]);

  // Auto-expand all projects on first load
  useEffect(() => {
    if (expandedProjects === null && orderedProjects.length > 0) {
      setExpandedProjects(new Set(orderedProjects.map((p) => p.id)));
    }
  }, [expandedProjects, orderedProjects]);

  const handleDragStart = useCallback((e: React.DragEvent, projectId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', projectId);
    setDragProjectId(projectId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (projectId !== dragOverProjectId) {
      setDragOverProjectId(projectId);
    }
  }, [dragOverProjectId]);

  const handleDrop = useCallback((e: React.DragEvent, targetProjectId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetProjectId) {
      setDragProjectId(null);
      setDragOverProjectId(null);
      return;
    }

    setLocalProjectOrder((prev) => {
      const newOrder = [...prev];
      const sourceIdx = newOrder.indexOf(sourceId);
      const targetIdx = newOrder.indexOf(targetProjectId);
      if (sourceIdx === -1 || targetIdx === -1) return prev;
      newOrder.splice(sourceIdx, 1);
      newOrder.splice(targetIdx, 0, sourceId);
      // Persist
      updateProjectOrder(newOrder);
      return newOrder;
    });

    setDragProjectId(null);
    setDragOverProjectId(null);
  }, [updateProjectOrder]);

  const handleDragEnd = useCallback(() => {
    setDragProjectId(null);
    setDragOverProjectId(null);
  }, []);

  // --- Activity drag-and-drop reorder state ---
  const [dragActivityId, setDragActivityId] = useState<string | null>(null);
  const [dragOverActivityId, setDragOverActivityId] = useState<string | null>(null);
  const [dragActivityProjectId, setDragActivityProjectId] = useState<string | null>(null);

  const handleActivityDragStart = useCallback((e: React.DragEvent, projectId: string, activityId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/activity', activityId);
    e.dataTransfer.setData('application/activity-project', projectId);
    setDragActivityId(activityId);
    setDragActivityProjectId(projectId);
  }, []);

  const handleActivityDragOver = useCallback((e: React.DragEvent, activityId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activityId !== dragOverActivityId) {
      setDragOverActivityId(activityId);
    }
  }, [dragOverActivityId]);

  const handleActivityDrop = useCallback((e: React.DragEvent, projectId: string, targetActivityId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('application/activity');
    const sourceProjectId = e.dataTransfer.getData('application/activity-project');
    if (!sourceId || sourceId === targetActivityId || sourceProjectId !== projectId) {
      setDragActivityId(null);
      setDragOverActivityId(null);
      setDragActivityProjectId(null);
      return;
    }

    const project = orderedProjects.find((p) => p.id === projectId);
    if (!project) return;

    const visibleActivities = project.activities;
    const currentOrder = visibleActivities.map((a) => a.id);
    const sourceIdx = currentOrder.indexOf(sourceId);
    const targetIdx = currentOrder.indexOf(targetActivityId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const newOrder = [...currentOrder];
    newOrder.splice(sourceIdx, 1);
    newOrder.splice(targetIdx, 0, sourceId);

    updateActivityOrder(projectId, newOrder);

    setDragActivityId(null);
    setDragOverActivityId(null);
    setDragActivityProjectId(null);
  }, [orderedProjects, updateActivityOrder]);

  const handleActivityDragEnd = useCallback(() => {
    setDragActivityId(null);
    setDragOverActivityId(null);
    setDragActivityProjectId(null);
  }, []);

  const expandAll = () => {
    setExpandedProjects(new Set(orderedProjects.map((p) => p.id)));
  };
  const collapseAll = () => {
    setExpandedProjects(new Set());
  };

  const getWeekNumber = (dateStr: string): number => {
    return getISOWeekNumber(new Date(dateStr));
  };

  const getProjectWeekRange = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return { startIdx: null, endIdx: null };
    let minIdx: number | null = null;
    let maxIdx: number | null = null;
    project.activities.forEach((a) => {
      if (a.startDate) {
        const col = dateToCol(a.startDate);
        if (minIdx === null || col < minIdx) minIdx = col;
      }
      if (a.endDate) {
        const col = dateToCol(a.endDate);
        if (maxIdx === null || col > maxIdx) maxIdx = col;
      }
    });
    return { startIdx: minIdx, endIdx: maxIdx };
  };

  const getProjectDayRange = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return { startDay: null, endDay: null };
    let minDay: string | null = null;
    let maxDay: string | null = null;
    project.activities.forEach((a) => {
      if (a.startDate && (!minDay || a.startDate < minDay)) minDay = a.startDate;
      if (a.endDate && (!maxDay || a.endDate > maxDay)) maxDay = a.endDate;
    });
    return { startDay: minDay, endDay: maxDay };
  };

  // Year header groups for weeks
  const weekYearGroups = useMemo(() => {
    if (viewMode !== 'weeks') return [];
    const groups: {year: number;month: string;span: number;}[] = [];
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
    const groups: {label: string;span: number;}[] = [];
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

  // Week number groups for day view
  const dayWeekGroups = useMemo(() => {
    if (viewMode !== 'days') return [];
    const groups: {label: string;span: number;}[] = [];
    displayedDays.forEach((day) => {
      const wn = getWeekNumber(toISODate(day.date));
      const label = `V${wn}`;
      if (groups.length > 0 && groups[groups.length - 1].label === label) {
        groups[groups.length - 1].span++;
      } else {
        groups.push({ label, span: 1 });
      }
    });
    return groups;
  }, [viewMode, displayedDays]);

  const columnCount = viewMode === 'weeks' ? displayedWeeks.length : displayedDays.length;
  const colWidth = viewMode === 'weeks' ? WEEK_COL_WIDTH : DAY_COL_WIDTH;
  const gridWidth = columnCount * colWidth;

  const todayWeekColIndex = todayWeekIndex;

  const todayColIndex = viewMode === 'weeks' ? todayWeekColIndex : todayDayIndex;

  // --- Scroll ref ---
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to today on mount / view mode change
  useEffect(() => {
    if (todayColIndex < 0) return;
    const scrollPos = Math.max(0, todayColIndex * colWidth - 300);
    requestAnimationFrame(() => {
      if (mainScrollRef.current) mainScrollRef.current.scrollLeft = scrollPos;
    });
  }, [viewMode, todayColIndex, colWidth]);

  // --- Drag & drop helpers ---
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

  const dateToCol = useCallback((dateStr: string): number => {
    if (viewMode === 'weeks') {
      const dateYear = parseInt(dateStr.substring(0, 4), 10);
      const weekNum = getWeekNumber(dateStr);
      const idx = displayedWeeks.findIndex((w) => w.weekNum === weekNum && w.year === dateYear);
      if (idx >= 0) return idx;
      // Fallback: find closest week by date comparison
      const target = dateStr;
      for (let i = 0; i < displayedWeeks.length; i++) {
        const wStart = toISODate(displayedWeeks[i].startDate);
        const wEnd = new Date(displayedWeeks[i].startDate);
        wEnd.setDate(wEnd.getDate() + 6);
        if (target >= wStart && target <= toISODate(wEnd)) return i;
      }
      return target < toISODate(displayedWeeks[0]?.startDate) ? -1 : displayedWeeks.length;
    } else {
      const target = dateStr;
      const idx = displayedDays.findIndex((d) => toISODate(d.date) === target);
      return idx >= 0 ? idx : target < toISODate(displayedDays[0]?.date) ? -1 : displayedDays.length;
    }
  }, [viewMode, displayedWeeks, displayedDays]);

  const handleDatesChange = useCallback(async (projectId: string, activityId: string, newStart: string, newEnd: string) => {
    await updateActivity(projectId, activityId, {
      startDate: newStart,
      endDate: newEnd
    });
  }, [updateActivity]);

  const handleSegmentDatesChange = useCallback(async (
    projectId: string,
    activityId: string,
    segmentIndex: number,
    segments: { start: string; end: string }[],
    newStart: string,
    newEnd: string,
  ) => {
    const next = segments.map((s, i) => i === segmentIndex ? { start: newStart, end: newEnd } : s);
    const allStarts = next.map(s => s.start).sort();
    const allEnds = next.map(s => s.end).sort();
    await updateActivity(projectId, activityId, {
      segments: next,
      startDate: allStarts[0],
      endDate: allEnds[allEnds.length - 1],
    });
  }, [updateActivity]);

  const renderTodayMarker = () => {
    if (todayColIndex < 0 || todayColIndex >= columnCount) return null;
    const leftPx = todayColIndex * colWidth + colWidth / 2;
    return (
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-destructive pointer-events-none"
        style={{ left: `${leftPx}px` }}>

        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-destructive" />
      </div>);

  };

  // Render background cells for an activity row
  const renderBackgroundCells = () => {
    if (viewMode === 'weeks') {
      return displayedWeeks.map((week, i) =>
      <div
        key={`${week.year}-${week.weekNum}`}
        className={cn(
          'h-6 border-r border-border/30',
          i === todayWeekIndex && 'bg-primary/5'
        )}
        style={{ width: colWidth, minWidth: colWidth }} />

      );
    } else {
      return displayedDays.map((day, i) =>
      <div
        key={i}
        className={cn(
          'h-6 border-r border-border/30',
          (day.dayOfWeek === 0 || day.dayOfWeek === 6) && 'bg-muted/40'
        )}
        style={{ width: colWidth, minWidth: colWidth }} />

      );
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-3 p-4">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ganttschema</h1>
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
              <Button
                variant={showArchived ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setShowArchived(!showArchived)}
              >
                <Archive className="h-3.5 w-3.5" />
                Arkiverade
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={expandAll}>
                Expandera
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={collapseAll}>
                Komprimera
              </Button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <StatusLegend
          items={statusLabels.map((s) => ({ color: s.color, label: s.label }))}
          showTodayMarker />


        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <CardContent className="p-0">
            {/* Single scrollable container for both axes */}
            <div
              ref={mainScrollRef}
              className="overflow-auto max-h-[calc(100vh-220px)]">

              <div style={{ width: LEFT_COL_WIDTH + gridWidth }}>
                {/* Year/Month header row */}
                <div className="sticky top-0 z-30 flex border-b border-border/30 bg-card">
                  <div className="sticky left-0 z-40 bg-card border-r border-border/50 flex shrink-0">
                    <div className="w-60 shrink-0" />
                    <div className="w-16 shrink-0" />
                  </div>
                  <div className="flex">
                    {viewMode === 'weeks' ?
                    weekYearGroups.map((g, i) =>
                    <div
                      key={i}
                      className="border-r border-border/30 text-center text-[10px] font-semibold text-muted-foreground py-0.5"
                      style={{ width: g.span * colWidth }}>

                            {g.month}
                          </div>
                    ) :
                    dayYearGroups.map((g, i) =>
                    <div
                      key={i}
                      className="border-r border-border/30 text-center text-[10px] font-semibold text-muted-foreground py-0.5"
                      style={{ width: g.span * colWidth }}>

                            {g.label}
                          </div>
                    )}
                  </div>
                </div>

                {/* Week number row for day view */}
                {viewMode === 'days' &&
                <div className="sticky top-[21px] z-30 flex border-b border-border/30 bg-card">
                    <div className="sticky left-0 z-40 bg-card flex shrink-0">
                      <div className="w-60 shrink-0 border-r border-border/50" />
                      <div className="w-16 shrink-0 border-r border-border/50" />
                    </div>
                    <div className="flex">
                      {dayWeekGroups.map((g, i) =>
                    <div
                      key={i}
                      className="border-r border-border/30 text-center text-[9px] font-semibold text-muted-foreground py-0.5"
                      style={{ width: g.span * colWidth }}>

                          {g.label}
                        </div>
                    )}
                    </div>
                  </div>
                }

                {/* Week/Day header row */}
                <div className={cn("sticky z-30 flex border-b border-border/50 bg-card", viewMode === 'days' ? 'top-[42px]' : 'top-[21px]')}>
                  <div className="sticky left-0 z-40 bg-card flex shrink-0">
                    <div className="w-60 shrink-0 border-r border-border/50 px-2 py-1 text-xs font-semibold">
                      Projekt / Aktivitet
                    </div>
                    <div className="w-16 shrink-0 border-r border-border/50 px-1 py-1 text-[10px] font-semibold text-muted-foreground pt-[5px] pl-[13px]">
                      Ansvarig
                    </div>
                  </div>
                  <div className="flex">
                    {viewMode === 'weeks' ?
                    displayedWeeks.map((week, i) =>
                    <div
                      key={`${week.year}-${week.weekNum}`}
                      className={cn(
                        'border-r border-border/30 py-0.5 text-center text-[10px] font-medium',
                        i === todayWeekIndex && 'bg-primary/10'
                      )}
                      style={{ width: colWidth, minWidth: colWidth }}>

                          <div>{week.label}</div>
                          <div className="text-muted-foreground text-[9px]">
                            {week.startDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                    ) :

                    displayedDays.map((day, i) =>
                    <div
                      key={i}
                      className={cn(
                        'border-r border-border/30 py-0.5 text-center text-[9px] font-medium',
                        (day.dayOfWeek === 0 || day.dayOfWeek === 6) && 'bg-muted/40',
                        toISODate(day.date) === todayStr && 'bg-primary/10'
                      )}
                      style={{ width: colWidth, minWidth: colWidth }}>

                          <div>{['Sö', 'Må', 'Ti', 'On', 'To', 'Fr', 'Lö'][day.dayOfWeek]}</div>
                          <div className="text-muted-foreground">{day.date.getDate()}</div>
                        </div>
                    )
                    }
                  </div>
                </div>

                {/* Projects and Activities */}
                <div className="relative">
                  {/* Today marker overlay */}
                  <div className="absolute top-0 bottom-0 pointer-events-none z-[5]" style={{ left: LEFT_COL_WIDTH }}>
                    {renderTodayMarker()}
                  </div>

                  {orderedProjects.map((project) => {
                    const isExpanded = expandedProjects?.has(project.id) ?? false;
                    const { startIdx, endIdx } = getProjectWeekRange(project.id);
                    const { startDay, endDay } = getProjectDayRange(project.id);
                    const activityCount = project.activities.length;
                    const isDragging = dragProjectId === project.id;
                    const isDragOver = dragOverProjectId === project.id && dragProjectId !== project.id;

                    return (
                      <motion.div key={project.id} variants={itemVariants}>
                        {/* Project Header */}
                        <div
                          className={cn(
                            'flex border-b border-border/50 bg-primary/15 cursor-pointer hover:bg-primary/20 transition-colors',
                            isDragging && 'opacity-40',
                            isDragOver && 'border-t-2 border-t-primary'
                          )}
                          onClick={() => toggleProject(project.id)}
                          onDragOver={(e) => handleDragOver(e, project.id)}
                          onDrop={(e) => handleDrop(e, project.id)}>

                          <div className="sticky left-0 z-10 bg-card flex shrink-0 relative">
                            <div className="absolute inset-0 bg-primary/15 pointer-events-none" />
                            <div className="w-60 shrink-0 border-r border-border/50 px-1 py-1 flex items-center justify-between relative">
                              <div className="flex items-center gap-1 min-w-0">
                                <div
                                  draggable
                                  onDragStart={(e) => {e.stopPropagation();handleDragStart(e, project.id);}}
                                  onDragEnd={handleDragEnd}
                                  onClick={(e) => e.stopPropagation()}
                                  className="cursor-grab active:cursor-grabbing shrink-0 p-0.5 rounded hover:bg-muted/50 transition-colors">

                                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                {isExpanded ?
                                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> :

                                <ChevronUp className="h-3 w-3 text-muted-foreground rotate-180 shrink-0" />
                                }
                                <span className="font-semibold text-xs truncate">{project.code} - {project.name}</span>
                                {!isExpanded &&
                                <span className="text-[10px] text-muted-foreground shrink-0">({activityCount})</span>
                                }
                              </div>
                              <div onClick={(e) => e.stopPropagation()}>
                                <AddActivityDialog
                                  projectId={project.id}
                                  trigger={
                                  <Button size="icon" variant="ghost" className="h-5 w-5">
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  } />

                              </div>
                            </div>
                            <div className="w-16 shrink-0 border-r border-border/50 relative" />
                          </div>
                          {/* Collapsed summary bar */}
                          {!isExpanded &&
                          <div className="flex items-center">
                              {viewMode === 'weeks' ?
                            displayedWeeks.map((week, i) => {
                              const isInRange = startIdx !== null && endIdx !== null &&
                              i >= startIdx && i <= endIdx;
                              const isStart = i === startIdx;
                              const isEnd = i === endIdx;
                              return (
                                <div key={`${week.year}-${week.weekNum}`} className="h-6 flex items-center justify-center border-r border-border/30" style={{ width: colWidth, minWidth: colWidth }}>
                                      {isInRange &&
                                  <div className={cn(
                                    'h-3.5 w-full bg-emerald-500/70',
                                    isStart && 'rounded-l ml-0.5',
                                    isEnd && 'rounded-r mr-0.5'
                                  )} />
                                  }
                                    </div>);

                            }) :

                            displayedDays.map((day, i) => {
                              const dayStr = toISODate(day.date);
                              const isInRange = startDay && endDay && dayStr >= startDay && dayStr <= endDay;
                              const isStart = dayStr === startDay;
                              const isEnd = dayStr === endDay;
                              return (
                                <div key={i} className={cn(
                                  'h-6 flex items-center justify-center border-r border-border/30',
                                  (day.dayOfWeek === 0 || day.dayOfWeek === 6) && 'bg-muted/40'
                                )} style={{ width: colWidth, minWidth: colWidth }}>
                                      {isInRange &&
                                  <div className={cn(
                                    'h-3.5 w-full bg-emerald-500/70',
                                    isStart && 'rounded-l ml-0.5',
                                    isEnd && 'rounded-r mr-0.5'
                                  )} />
                                  }
                                    </div>);

                            })
                            }
                            </div>
                          }
                          {isExpanded && <div style={{ width: gridWidth }} />}
                        </div>

                        {/* Activities */}
                        <AnimatePresence>
                          {isExpanded && project.activities.map((activity) => {
                            const derived = deriveStatus(activity.status);
                            const hasDates = !!(activity.startDate || activity.endDate);
                            const actStartCol = activity.startDate ? dateToCol(activity.startDate) : -1;
                            const actEndCol = activity.endDate ? dateToCol(activity.endDate) : actStartCol;
                            const barVisible = hasDates && actStartCol >= 0 && actEndCol >= 0 && actStartCol < columnCount;
                            const isActDragging = dragActivityId === activity.id;
                            const isActDragOver = dragOverActivityId === activity.id && dragActivityId !== activity.id && dragActivityProjectId === project.id;

                            return (
                              <motion.div
                                key={activity.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className={cn(
                                  'flex border-b border-border/30 hover:bg-muted/20 group',
                                  isActDragging && 'opacity-40',
                                  isActDragOver && 'border-t-2 border-t-primary'
                                )}
                                onDragOver={(e) => {if (e.dataTransfer.types.includes('application/activity')) handleActivityDragOver(e, activity.id);}}
                                onDrop={(e) => {if (e.dataTransfer.types.includes('application/activity')) handleActivityDrop(e, project.id, activity.id);}}>

                                <div className="sticky left-0 z-10 bg-card flex shrink-0 group-hover:bg-muted/20">
                                  <div className="w-60 shrink-0 border-r px-1 py-0.5 pl-5 flex items-center justify-between min-w-0 bg-primary-foreground border-primary-foreground">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <div
                                        draggable
                                        onDragStart={(e) => {e.stopPropagation();handleActivityDragStart(e, project.id, activity.id);}}
                                        onDragEnd={handleActivityDragEnd}
                                        onClick={(e) => e.stopPropagation()}
                                        className="cursor-grab active:cursor-grabbing shrink-0 p-0.5 rounded hover:bg-muted/50 transition-colors">

                                        <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                                      </div>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="min-w-0 flex items-center gap-1.5">
                                            {activity.isMilestone ? (
                                              <div className={cn("h-3 w-3 shrink-0 rotate-45 rounded-none", getStatusDotColor(derived))} />
                                            ) : (
                                              <div className={cn("h-5 w-3 shrink-0 rounded-none", getStatusDotColor(derived))} />
                                            )}
                                            <span className="text-xs truncate">{activity.name}</span>
                                          </div>
                                        </TooltipTrigger>
                                      <TooltipContent side="right" className="text-xs max-w-xs">
                                        <p className="font-semibold">{activity.name}</p>
                                        {hasDates ? (
                                          <p className="text-muted-foreground">
                                            {activity.startDate} → {activity.endDate}
                                          </p>
                                        ) : (
                                          <p className="text-muted-foreground italic">Datum ej angivet</p>
                                        )}
                                        <p className="text-muted-foreground">
                                          Status: {derived} • {activity.responsible}
                                        </p>
                                        {activity.notes && (
                                          <p className="text-muted-foreground italic mt-0.5">
                                            {activity.notes}
                                          </p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                    </div>
                                    <EditActivityDialog
                                      projectId={project.id}
                                      activity={activity}
                                      trigger={
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">

                                          <span className="sr-only">Redigera</span>
                                          ✏️
                                        </Button>
                                      } />

                                  </div>
                                  <div className="w-16 shrink-0 border-r border-border/50 px-1 py-0.5 bg-primary-foreground flex items-center justify-center text-slate-950">
                                    {(() => {
                                      const matchedProfile = profiles.find(p => getDisplayName(p) === activity.responsible);
                                      if (matchedProfile) {
                                        return (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div><UserAvatar profile={matchedProfile} size="xs" /></div>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="text-xs">{activity.responsible}</TooltipContent>
                                          </Tooltip>
                                        );
                                      }
                                      return <span className="text-[12px] text-muted-foreground truncate text-center">{activity.responsible}</span>;
                                    })()}
                                  </div>
                                </div>
                                {/* Grid area with absolute-positioned draggable bar */}
                                <div className="flex items-center relative" style={{ width: gridWidth }}>
                                  {/* Background cells for grid lines */}
                                  {renderBackgroundCells()}
                                  {/* Draggable bar overlay – segmented or single */}
                                  {(() => {
                                    const segs = activity.segments && activity.segments.length >= 2 ? activity.segments : null;
                                    if (segs) {
                                      // Render one bar per segment + dashed connector lines for pauses
                                      const sortedSegs = [...segs].sort((a, b) => a.start.localeCompare(b.start));
                                      const bars: JSX.Element[] = [];
                                      sortedSegs.forEach((seg, idx) => {
                                        const sCol = dateToCol(seg.start);
                                        const eCol = dateToCol(seg.end);
                                        if (sCol < 0 || sCol >= columnCount || eCol < 0) return;
                                        bars.push(
                                          <GanttBar
                                            key={`${activity.id}-seg-${idx}`}
                                            activityId={activity.id}
                                            projectId={project.id}
                                            activityName={`${activity.name} (del ${idx + 1}/${sortedSegs.length})`}
                                            startDate={seg.start}
                                            endDate={seg.end}
                                            statusColor={getStatusColor(derived)}
                                            derivedStatus={derived}
                                            responsible={activity.responsible}
                                            columnCount={columnCount}
                                            startCol={sCol}
                                            endCol={eCol}
                                            onDatesChange={(pid, aid, ns, ne) =>
                                              handleSegmentDatesChange(pid, aid, idx, sortedSegs, ns, ne)
                                            }
                                            colToDate={colToDate}
                                            dateToCol={dateToCol}
                                            colWidth={colWidth}
                                            snapCols={1}
                                            isMilestone={false}
                                          />
                                        );
                                        // Dashed connector to the next segment
                                        if (idx < sortedSegs.length - 1) {
                                          const nextSeg = sortedSegs[idx + 1];
                                          const nextStartCol = dateToCol(nextSeg.start);
                                          const gapStartPx = (eCol + 1) * colWidth;
                                          const gapEndPx = nextStartCol * colWidth;
                                          if (gapEndPx > gapStartPx) {
                                            bars.push(
                                              <div
                                                key={`${activity.id}-gap-${idx}`}
                                                className="absolute top-1/2 -translate-y-1/2 border-t-2 border-dashed border-muted-foreground/40 pointer-events-none"
                                                style={{ left: `${gapStartPx}px`, width: `${gapEndPx - gapStartPx}px` }}
                                                title="Paus"
                                              />
                                            );
                                          }
                                        }
                                      });
                                      return bars;
                                    }
                                    return barVisible && (
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
                                        colWidth={colWidth}
                                        snapCols={1}
                                        isMilestone={activity.isMilestone}
                                      />
                                    );
                                  })()}
                                </div>
                              </motion.div>);

                          })}
                        </AnimatePresence>
                      </motion.div>);

                  })}

                  {orderedProjects.length === 0 &&
                  <div className="p-6 text-center text-muted-foreground text-sm">
                      Inga aktiviteter med datum. Lägg till aktiviteter med start- och slutdatum för att se dem här.
                    </div>
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </TooltipProvider>);

}