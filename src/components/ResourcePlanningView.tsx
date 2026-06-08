import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Users, Archive, UserPlus, Calculator, Trash2, Hotel } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusLegend } from './StatusLegend';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { useResourceData, ProjectInstaller } from '@/hooks/useResourceData';
import { ManageInstallersDialog } from './dialogs/ManageInstallersDialog';
import { AssignInstallerDialog } from './dialogs/AssignInstallerDialog';
import { ReassignInstallerDialog } from './dialogs/ReassignInstallerDialog';
import { DailyEntryDialog } from './dialogs/DailyEntryDialog';
import { EditEstimationDialog } from './dialogs/EditEstimationDialog';
import { HotelBookingCell } from './HotelBookingCell';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from
'@/components/ui/tooltip';


const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
};

type ViewMode = 'weeks' | 'days';

const resourceLegend = [
{ color: 'bg-status-completed', label: 'Inom kalkyl' },
{ color: 'bg-status-delayed', label: 'Överskrider kalkyl' }];


// ISO 8601 week number
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function generateWeeks(year: number) {
  const weeks: {weekNum: number;startDate: Date;label: string;}[] = [];
  // Find Monday of ISO week 1: Monday of the week containing Jan 4
  const jan4 = new Date(year, 0, 4);
  let current = new Date(jan4);
  current.setDate(current.getDate() - ((current.getDay() + 6) % 7));
  const endLimit = new Date(year + 1, 1, 1);
  while (current < endLimit) {
    const wn = getISOWeekNumber(current);
    // Only include weeks belonging to this year (ISO week year)
    const d = new Date(Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const isoYear = d.getUTCFullYear();
    if (isoYear > year) break;
    if (isoYear === year) {
      weeks.push({ weekNum: wn, startDate: new Date(current), label: `V${wn}` });
    }
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateAllDays(year: number) {
  const days: {date: Date;dateStr: string;label: string;dayOfWeek: number;}[] = [];
  const current = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  while (current <= endDate) {
    days.push({
      date: new Date(current),
      dateStr: formatLocalDate(current),
      label: current.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }),
      dayOfWeek: current.getDay()
    });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

// Fixed column widths
const WEEK_COL_WIDTH = 56;
const DAY_COL_WIDTH = 32;
const LEFT_COL_WIDTH = 288; // w-72 = 18rem = 288px
const KALKYL_COL_WIDTH = 0; // merged into Projekt/Montör column
const HOTEL_COL_WIDTH = 96; // hotel booking column (compact)

export function ResourcePlanningView() {
  const { projects: allProjects } = useProjectDataContext();
  const {
    installers, estimations, projectInstallers, dailyEntries, isLoading,
    addInstaller, updateInstaller, deleteInstaller,
    upsertEstimation, assignInstaller, assignVacant, unassignInstaller, reassignInstaller,
    upsertDailyEntry, updateHotel
  } = useResourceData();

  const [expandedProjects, setExpandedProjects] = useState<Set<string> | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const [showArchived, setShowArchived] = useState(false);
  const [filterInstallers, setFilterInstallers] = useState<string[]>([]);
  const [filterCompanies, setFilterCompanies] = useState<string[]>([]);
  const [filterOverloaded, setFilterOverloaded] = useState(false);
  const [filterNoResources, setFilterNoResources] = useState(false);

  // Daily entry dialog state
  const [dailyDialogOpen, setDailyDialogOpen] = useState(false);
  const [dailyDialogProject, setDailyDialogProject] = useState('');
  const [dailyDialogDate, setDailyDialogDate] = useState('');
  const [dailyDialogProjectInstallerId, setDailyDialogProjectInstallerId] = useState<string | undefined>(undefined);

  // Estimation dialog state
  const [estDialogOpen, setEstDialogOpen] = useState(false);
  const [estDialogProjectId, setEstDialogProjectId] = useState('');
  const [estDialogProjectName, setEstDialogProjectName] = useState('');

  // Reassign dialog state
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<ProjectInstaller | null>(null);

  const weeks = useMemo(() => generateWeeks(2026), []);
  const allDays = useMemo(() => generateAllDays(2026), []);

  const today = useMemo(() => {const d = new Date();d.setHours(0, 0, 0, 0);return d;}, []);
  const todayStr = formatLocalDate(today);

  const displayedWeeks = weeks;
  const displayedDays = allDays;

  const todayWeekNum = useMemo(() => {
    const todayDate = formatLocalDate(today);
    for (const w of weeks) {
      const wStart = formatLocalDate(w.startDate);
      const wEnd = new Date(w.startDate);
      wEnd.setDate(wEnd.getDate() + 6);
      const wEndStr = formatLocalDate(wEnd);
      if (todayDate >= wStart && todayDate <= wEndStr) return w.weekNum;
    }
    return -1;
  }, [today, weeks]);

  const activeProjects = allProjects.filter((p) => p.status !== 'Avslutat');
  const archivedProjects = allProjects.filter((p) => p.status === 'Avslutat');
  const displayProjects = showArchived ? archivedProjects : activeProjects;

  const filteredProjects = useMemo(() => {
    let result = displayProjects;
    if (filterInstallers.length > 0) {
      const projectIds = new Set(projectInstallers.filter((pi) => pi.installerId && filterInstallers.includes(pi.installerId)).map((pi) => pi.projectId));
      result = result.filter((p) => projectIds.has(p.id));
    }
    if (filterCompanies.length > 0) {
      const installerIds = new Set(installers.filter((i) => filterCompanies.includes(i.company)).map((i) => i.id));
      const projectIds = new Set(projectInstallers.filter((pi) => pi.installerId && installerIds.has(pi.installerId)).map((pi) => pi.projectId));
      result = result.filter((p) => projectIds.has(p.id));
    }
    if (filterOverloaded) {
      result = result.filter((p) => getResourceStatus(p.id) === 'over');
    }
    if (filterNoResources) {
      result = result.filter((p) => !projectInstallers.some((pi) => pi.projectId === p.id));
    }
    return result;
  }, [displayProjects, filterInstallers, filterCompanies, filterOverloaded, filterNoResources, projectInstallers, installers, dailyEntries, estimations]);

  // Auto-expand all projects on first load
  useEffect(() => {
    if (expandedProjects === null && filteredProjects.length > 0) {
      setExpandedProjects(new Set(filteredProjects.map((p) => p.id)));
    }
  }, [expandedProjects, filteredProjects]);

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedProjects(new Set(filteredProjects.map((p) => p.id)));
  const collapseAll = () => setExpandedProjects(new Set());

  const getProjectInstallers = (projectId: string) => projectInstallers.filter((pi) => pi.projectId === projectId);
  const getProjectDailyEntries = (projectId: string) => dailyEntries.filter((d) => d.projectId === projectId);
  const getEstimation = (projectId: string) => estimations.find((e) => e.projectId === projectId);

  function getProjectSummary(projectId: string) {
    const entries = getProjectDailyEntries(projectId);
    const totalWork = entries.reduce((s, e) => s + e.plannedWorkHours, 0);
    const totalTravel = entries.reduce((s, e) => s + e.plannedTravelHours, 0);
    return { totalWork, totalTravel, total: totalWork + totalTravel };
  }

  function getResourceStatus(projectId: string): 'ok' | 'warning' | 'over' {
    const est = getEstimation(projectId);
    const totalEstimated = (est?.estimatedInstallHours || 0) + (est?.estimatedTravelHours || 0);
    if (totalEstimated === 0) return 'ok';
    const { total } = getProjectSummary(projectId);
    if (total > totalEstimated) return 'over';
    return 'ok';
  }

  const getBarColor = (status: 'ok' | 'warning' | 'over') => {
    switch (status) {
      case 'ok':return 'bg-status-completed';
      case 'warning':return 'bg-status-in-progress';
      case 'over':return 'bg-status-delayed';
    }
  };

  const columnCount = viewMode === 'weeks' ? displayedWeeks.length : displayedDays.length;
  const colWidth = viewMode === 'weeks' ? WEEK_COL_WIDTH : DAY_COL_WIDTH;
  const gridWidth = columnCount * colWidth;

  const yearGroups = useMemo(() => {
    const items = viewMode === 'weeks' ? displayedWeeks : displayedDays;
    const groups: {label: string;span: number;}[] = [];
    items.forEach((item) => {
      const d = 'startDate' in item ? item.startDate : (item as any).date;
      const y = d.getFullYear();
      const m = d.toLocaleDateString('sv-SE', { month: 'short' });
      const label = `${y} • ${m}`;
      if (groups.length > 0 && groups[groups.length - 1].label === label) groups[groups.length - 1].span++;else
      groups.push({ label, span: 1 });
    });
    return groups;
  }, [viewMode, displayedWeeks, displayedDays]);

  // Week number groups for day view
  const dayWeekGroups = useMemo(() => {
    if (viewMode !== 'days') return [];
    const groups: {label: string;span: number;}[] = [];
    displayedDays.forEach((day) => {
      const wn = getISOWeekNumber(day.date);
      const label = `V${wn}`;
      if (groups.length > 0 && groups[groups.length - 1].label === label) groups[groups.length - 1].span++;else
      groups.push({ label, span: 1 });
    });
    return groups;
  }, [viewMode, displayedDays]);

  const todayColIndex = useMemo(() => {
    if (viewMode === 'weeks') return displayedWeeks.findIndex((w) => w.weekNum === todayWeekNum);
    return displayedDays.findIndex((d) => d.dateStr === todayStr);
  }, [viewMode, displayedWeeks, displayedDays, todayWeekNum, todayStr]);

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

  const openDailyDialog = (projectId: string, dateStr: string, projectInstallerId?: string) => {
    const pInstallers = getProjectInstallers(projectId);
    if (pInstallers.length === 0) {
      toast.error('Koppla montörer till projektet först');
      return;
    }
    setDailyDialogProject(projectId);
    setDailyDialogDate(dateStr);
    setDailyDialogProjectInstallerId(projectInstallerId);
    setDailyDialogOpen(true);
  };

  const getWeekRange = (week: {startDate: Date;}) => {
    const weekStart = week.startDate;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return { start: formatLocalDate(weekStart), end: formatLocalDate(weekEnd) };
  };

  // Render schedule cells for a single installer in DAY view
  const renderInstallerDayCells = (projectId: string, projectInstallerId: string, installerId: string | null, status: 'ok' | 'warning' | 'over') => {
    const entries = dailyEntries.filter((d) => d.projectInstallerId === projectInstallerId || (!d.projectInstallerId && installerId && d.projectId === projectId && d.installerId === installerId));
    const entryMap = new Map(entries.map((e) => [e.date, e]));

    return displayedDays.map((day, i) => {
      const entry = entryMap.get(day.dateStr);
      const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
      const totalH = entry ? entry.plannedWorkHours + entry.plannedTravelHours : 0;
      return (
        <div
          key={i}
          className={cn(
            'h-7 border-r border-border/30 relative cursor-pointer hover:bg-primary/10 transition-colors',
            isWeekend && 'bg-muted/40'
          )}
          style={{ width: colWidth, minWidth: colWidth }}
          onClick={() => openDailyDialog(projectId, day.dateStr, projectInstallerId)}>

          {entry && totalH > 0 &&
          <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute inset-0.5 flex flex-col gap-px">
                  {entry.plannedWorkHours > 0 &&
                <div className={cn('flex-1 rounded-sm flex items-center justify-center', getBarColor(status))}>
                      <span className="text-[8px] font-bold text-white">{entry.plannedWorkHours}h</span>
                    </div>
                }
                  {entry.plannedTravelHours > 0 &&
                <div className={cn('h-3.5 rounded-sm flex items-center justify-center bg-stripes', getBarColor(status), 'brightness-75')}>
                      <span className="text-[8px] font-bold text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]">{entry.plannedTravelHours}h</span>
                    </div>
                }
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>{entry.installerName} – {day.dateStr}</p>
                <p>Arbete: {entry.plannedWorkHours}h</p>
                <p>Resa: {entry.plannedTravelHours}h</p>
              </TooltipContent>
            </Tooltip>
          }
        </div>);

    });
  };

  // Render schedule cells for a single installer in WEEK view
  const renderInstallerWeekCells = (projectId: string, projectInstallerId: string, installerId: string | null, status: 'ok' | 'warning' | 'over') => {
    const entries = dailyEntries.filter((d) => d.projectInstallerId === projectInstallerId || (!d.projectInstallerId && installerId && d.projectId === projectId && d.installerId === installerId));

    return displayedWeeks.map((week) => {
      const { start, end } = getWeekRange(week);
      const weekEntries = entries.filter((e) => e.date >= start && e.date <= end);
      const workH = weekEntries.reduce((s, e) => s + e.plannedWorkHours, 0);
      const travelH = weekEntries.reduce((s, e) => s + e.plannedTravelHours, 0);
      const totalH = workH + travelH;

      return (
        <div
          key={week.weekNum}
          className={cn('h-7 border-r border-border/30 relative', week.weekNum === todayWeekNum && 'bg-primary/5')}
          style={{ width: colWidth, minWidth: colWidth }}>

          {totalH > 0 &&
          <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn('absolute inset-0.5 rounded-sm flex items-center justify-center', getBarColor(status))}>
                  <span className="text-[8px] font-bold text-white">
                    {workH}h{travelH > 0 ? ` +${travelH}h` : ''}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>V{week.weekNum}</p>
                <p>Arbete: {workH}h</p>
                <p>Resa: {travelH}h</p>
              </TooltipContent>
            </Tooltip>
          }
        </div>);

    });
  };

  // Render project-level summary cells in WEEK view (collapsed)
  const renderProjectWeekCells = (projectId: string, status: 'ok' | 'warning' | 'over') => {
    const entries = getProjectDailyEntries(projectId);
    return displayedWeeks.map((week) => {
      const { start, end } = getWeekRange(week);
      const weekEntries = entries.filter((e) => e.date >= start && e.date <= end);
      const workH = weekEntries.reduce((s, e) => s + e.plannedWorkHours, 0);
      const travelH = weekEntries.reduce((s, e) => s + e.plannedTravelHours, 0);
      const totalH = workH + travelH;

      return (
        <div
          key={week.weekNum}
          className={cn('h-7 border-r border-border/30 relative', week.weekNum === todayWeekNum && 'bg-primary/5')}
          style={{ width: colWidth, minWidth: colWidth }}>

          {totalH > 0 &&
          <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn('absolute inset-0.5 rounded-sm flex items-center justify-center', getBarColor(status))}>
                  <span className="text-[8px] font-bold text-white">{totalH}h</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>V{week.weekNum}: {totalH}h totalt</p>
                <p>Arbete: {workH}h</p>
                <p>Resa: {travelH}h</p>
              </TooltipContent>
            </Tooltip>
          }
        </div>);

    });
  };

  // Render project-level summary cells in DAY view (collapsed)
  const renderProjectDayCells = (projectId: string, status: 'ok' | 'warning' | 'over') => {
    const entries = getProjectDailyEntries(projectId);
    const entryByDate = new Map<string, {work: number;travel: number;}>();
    entries.forEach((e) => {
      const existing = entryByDate.get(e.date) || { work: 0, travel: 0 };
      entryByDate.set(e.date, { work: existing.work + e.plannedWorkHours, travel: existing.travel + e.plannedTravelHours });
    });

    return displayedDays.map((day, i) => {
      const dayData = entryByDate.get(day.dateStr);
      const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
      const totalH = dayData ? dayData.work + dayData.travel : 0;

      return (
        <div
          key={i}
          className={cn(
            'h-7 border-r border-border/30 relative cursor-pointer hover:bg-primary/10 transition-colors',
            isWeekend && 'bg-muted/40'
          )}
          style={{ width: colWidth, minWidth: colWidth }}
          onClick={() => openDailyDialog(projectId, day.dateStr)}>

          {totalH > 0 &&
          <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn('absolute inset-0.5 rounded-sm flex items-center justify-center', getBarColor(status))}>
                  <span className="text-[8px] font-bold text-white">{totalH}h</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>{day.dateStr}</p>
                <p>Arbete: {dayData!.work}h</p>
                <p>Resa: {dayData!.travel}h</p>
              </TooltipContent>
            </Tooltip>
          }
        </div>);

    });
  };

  const companies = useMemo(() => [...new Set(installers.map((i) => i.company).filter(Boolean))], [installers]);

  return (
    <TooltipProvider delayDuration={200}>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Resursplanering</h1>
            <p className="text-sm text-muted-foreground">Planera montörer och resurser per projekt</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 items-center gap-1 rounded-md border border-input bg-background p-1">
              <button
                onClick={() => setViewMode('weeks')}
                className={cn('rounded-sm px-3 py-1 text-xs font-medium transition-colors', viewMode === 'weeks' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                Veckor</button>
              <button
                onClick={() => setViewMode('days')}
                className={cn('rounded-sm px-3 py-1 text-xs font-medium transition-colors', viewMode === 'days' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                Dagar</button>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={expandAll}>Expandera</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={collapseAll}>Komprimera</Button>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <StatusLegend items={resourceLegend} showTodayMarker />
          <div className="flex-1" />

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs justify-between w-[160px]">
                <span className="truncate">
                  {filterInstallers.length === 0 ? 'Alla montörer' : `${filterInstallers.length} montör${filterInstallers.length > 1 ? 'er' : ''}`}
                </span>
                <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 max-h-72 overflow-auto" align="end">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-muted-foreground">Filtrera montörer</span>
                {filterInstallers.length > 0 && (
                  <button className="text-[10px] text-primary hover:underline" onClick={() => setFilterInstallers([])}>Rensa</button>
                )}
              </div>
              {installers.map((i) => (
                <label key={i.id} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer">
                  <Checkbox
                    checked={filterInstallers.includes(i.id)}
                    onCheckedChange={(v) => setFilterInstallers((prev) => v ? [...prev, i.id] : prev.filter(x => x !== i.id))}
                  />
                  <span className="text-xs truncate">{i.name} <span className="text-muted-foreground">({i.company})</span></span>
                </label>
              ))}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs justify-between w-[150px]">
                <span className="truncate">
                  {filterCompanies.length === 0 ? 'Alla företag' : `${filterCompanies.length} företag`}
                </span>
                <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 max-h-72 overflow-auto" align="end">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-muted-foreground">Filtrera företag</span>
                {filterCompanies.length > 0 && (
                  <button className="text-[10px] text-primary hover:underline" onClick={() => setFilterCompanies([])}>Rensa</button>
                )}
              </div>
              {companies.map((c) => (
                <label key={c} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer">
                  <Checkbox
                    checked={filterCompanies.includes(c)}
                    onCheckedChange={(v) => setFilterCompanies((prev) => v ? [...prev, c] : prev.filter(x => x !== c))}
                  />
                  <span className="text-xs truncate">{c}</span>
                </label>
              ))}
            </PopoverContent>
          </Popover>

          <Button variant={filterNoResources ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setFilterNoResources(!filterNoResources)}>
            Utan resurser
          </Button>
          <Button variant={showArchived ? "default" : "outline"} size="sm" className="h-7 text-xs gap-1" onClick={() => setShowArchived(!showArchived)}>
            <Archive className="h-3 w-3" />Arkiverade
          </Button>

          <ManageInstallersDialog
            installers={installers}
            onAdd={addInstaller}
            onUpdate={updateInstaller}
            onDelete={deleteInstaller}
            trigger={<Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Users className="h-3 w-3" />Montörer</Button>} />

        </div>

        {/* Main Grid */}
        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <CardContent className="p-0">
            {/* Single scrollable container for both axes */}
            <div
              ref={mainScrollRef}
              className="overflow-auto max-h-[calc(100vh-280px)]">

              <div style={{ width: LEFT_COL_WIDTH + KALKYL_COL_WIDTH + HOTEL_COL_WIDTH + gridWidth }}>
                {/* Year/Month header */}
                <div className="sticky top-0 z-30 flex border-b border-border/30 bg-card">
                  <div className="sticky left-0 z-40 bg-card shrink-0 border-r border-border/50" style={{ width: LEFT_COL_WIDTH + KALKYL_COL_WIDTH + HOTEL_COL_WIDTH }} />
                  <div className="flex">
                    {yearGroups.map((g, i) =>
                    <div key={i} className="border-r border-border/30 text-center text-[10px] font-semibold text-muted-foreground py-0.5" style={{ width: g.span * colWidth }}>
                        {g.label}
                      </div>
                    )}
                  </div>
                </div>

                {/* Week number row for day view */}
                {viewMode === 'days' &&
                <div className="sticky top-[21px] z-30 flex border-b border-border/30 bg-card">
                    <div className="sticky left-0 z-40 bg-card shrink-0 border-r border-border/50" style={{ width: LEFT_COL_WIDTH + KALKYL_COL_WIDTH + HOTEL_COL_WIDTH }} />
                    <div className="flex">
                      {dayWeekGroups.map((g, i) =>
                    <div key={i} className="border-r border-border/30 text-center text-[9px] font-semibold text-muted-foreground py-0.5" style={{ width: g.span * colWidth }}>
                          {g.label}
                        </div>
                    )}
                    </div>
                  </div>
                }

                {/* Week/Day header */}
                <div className={cn("sticky z-30 flex border-b border-border/50 bg-card", viewMode === 'days' ? 'top-[42px]' : 'top-[21px]')}>
                  <div className="sticky left-0 z-40 bg-card shrink-0 border-r border-border/50 flex" style={{ width: LEFT_COL_WIDTH + KALKYL_COL_WIDTH + HOTEL_COL_WIDTH }}>
                    <div className="w-72 shrink-0 px-2 py-1 text-xs font-semibold">
                      Projekt / Montör · Kalkyl / Utfall
                    </div>
                    <div className="border-l border-border/50 px-2 py-1 text-xs font-semibold flex items-center gap-1" style={{ width: HOTEL_COL_WIDTH }}>
                      <Hotel className="h-3 w-3" /> Hotell
                    </div>
                  </div>
                  <div className="flex">
                    {viewMode === 'weeks' ? displayedWeeks.map((week) =>
                    <div key={week.weekNum} className={cn('border-r border-border/30 py-0.5 text-center text-[10px] font-medium', week.weekNum === todayWeekNum && 'bg-primary/10')} style={{ width: colWidth, minWidth: colWidth }}>
                        <div>{week.label}</div>
                        <div className="text-muted-foreground text-[9px]">{week.startDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}</div>
                      </div>
                    ) : displayedDays.map((day, i) =>
                    <div key={i} className={cn('border-r border-border/30 py-0.5 text-center text-[9px] font-medium', (day.dayOfWeek === 0 || day.dayOfWeek === 6) && 'bg-muted/40', day.dateStr === todayStr && 'bg-primary/10')} style={{ width: colWidth, minWidth: colWidth }}>
                        <div>{['Sö', 'Må', 'Ti', 'On', 'To', 'Fr', 'Lö'][day.dayOfWeek]}</div>
                        <div className="text-muted-foreground">{day.date.getDate()}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Projects */}
                <div className="relative">
                  <div className="absolute top-0 bottom-0 pointer-events-none z-[5]" style={{ left: LEFT_COL_WIDTH + KALKYL_COL_WIDTH + HOTEL_COL_WIDTH }}>
                    {renderTodayMarker()}
                  </div>

                  {filteredProjects.map((project) => {
                    const isExpanded = expandedProjects?.has(project.id) ?? false;
                    const allPInstallers = getProjectInstallers(project.id);
                    const pInstallers = allPInstallers.filter((pi) => {
                      if (filterInstallers.length > 0 && (!pi.installerId || !filterInstallers.includes(pi.installerId))) return false;
                      if (filterCompanies.length > 0 && (!pi.installerCompany || !filterCompanies.includes(pi.installerCompany))) return false;
                      return true;
                    });
                    const resourceStatus = getResourceStatus(project.id);
                    const isArchived = project.status === 'Avslutat';

                    return (
                      <motion.div key={project.id} variants={itemVariants}>
                        {/* Project row */}
                        <div className="flex border-b border-border/50 bg-primary/15 cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => toggleProject(project.id)}>
                          <div className="sticky left-0 z-10 bg-card shrink-0 border-r border-border/50 flex" style={{ width: LEFT_COL_WIDTH + KALKYL_COL_WIDTH + HOTEL_COL_WIDTH }}>
                            <div className="w-72 shrink-0 px-2 py-1 flex items-center justify-between relative gap-1.5">
                            <div className="absolute inset-0 bg-primary/15 pointer-events-none" />
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                               {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronUp className="h-3 w-3 text-muted-foreground rotate-180 shrink-0" />}
                               <div className={cn('h-2 w-2 rounded-full shrink-0', getBarColor(resourceStatus))} />
                               <span className="font-semibold text-xs truncate">{project.code} - {project.name}</span>
                               {!isExpanded && <span className="text-[10px] text-muted-foreground shrink-0">({pInstallers.length})</span>}
                             </div>
                             {(() => {
                                 const est = getEstimation(project.id);
                                 const summary = getProjectSummary(project.id);
                                 const estTotal = (est?.estimatedInstallHours || 0) + (est?.estimatedTravelHours || 0);
                                 if (estTotal === 0 && summary.total === 0) return null;
                                 return (
                                   <Tooltip>
                                     <TooltipTrigger asChild>
                                       <span className={cn(
                                         'relative text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0',
                                         resourceStatus === 'ok' && 'bg-status-completed/20 text-status-completed border-status-completed/40',
                                         resourceStatus === 'over' && 'bg-status-delayed/20 text-status-delayed border-status-delayed/40'
                                       )}>
                                         {estTotal > 0 ? `${estTotal}h` : '–'} / {summary.total}h
                                       </span>
                                     </TooltipTrigger>
                                     <TooltipContent side="top" className="text-xs">
                                       <p className="font-semibold mb-1">Kalkyl vs Utfall</p>
                                       <p>Montage: {est?.estimatedInstallHours || 0}h kalkyl / {summary.totalWork}h utfall</p>
                                       <p>Resa: {est?.estimatedTravelHours || 0}h kalkyl / {summary.totalTravel}h utfall</p>
                                       <p className="mt-1 font-medium">Totalt: {estTotal}h / {summary.total}h</p>
                                     </TooltipContent>
                                   </Tooltip>);
                               })()}
                             <div className="flex items-center gap-0.5 relative" onClick={(e) => e.stopPropagation()}>
                                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => {
                                 setEstDialogProjectId(project.id);
                                 setEstDialogProjectName(`${project.code} - ${project.name}`);
                                 setEstDialogOpen(true);
                               }}>
                                    <Calculator className="h-3 w-3" />
                                  </Button>
                                  <AssignInstallerDialog
                                 projectName={project.name}
                                 installers={installers}
                                 projectInstallers={allPInstallers}
                                 onAssign={(installerId) => assignInstaller(project.id, installerId)}
                                 onAssignVacant={() => assignVacant(project.id)}
                                 onUnassign={unassignInstaller}
                                 trigger={<Button size="icon" variant="ghost" className="h-5 w-5"><UserPlus className="h-3 w-3" /></Button>} />

                                </div>
                           </div>
                            {/* Hotel summary column */}
                            <div className="border-l border-border/50 flex items-center justify-center relative px-1" style={{ width: HOTEL_COL_WIDTH }}>
                              <div className="absolute inset-0 bg-primary/15 pointer-events-none" />
                            </div>
                          </div>
                          {/* Schedule cells */}
                          <div className="flex items-center relative">
                            {!isExpanded && viewMode === 'weeks' && renderProjectWeekCells(project.id, resourceStatus)}
                            {!isExpanded && viewMode === 'days' && renderProjectDayCells(project.id, resourceStatus)}
                            {isExpanded && viewMode === 'weeks' && displayedWeeks.map((w) =>
                            <div key={w.weekNum} className={cn('h-7 border-r border-border/30', w.weekNum === todayWeekNum && 'bg-primary/5')} style={{ width: colWidth, minWidth: colWidth }} />
                            )}
                            {isExpanded && viewMode === 'days' && displayedDays.map((day, i) =>
                            <div key={i} className={cn('h-7 border-r border-border/30', (day.dayOfWeek === 0 || day.dayOfWeek === 6) && 'bg-muted/40')} style={{ width: colWidth, minWidth: colWidth }} />
                            )}
                          </div>
                        </div>

                        {/* Expanded: installer rows */}
                        <AnimatePresence>
                          {isExpanded &&
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                              {pInstallers.map((pi) =>
                            <div key={pi.id} className="flex border-b border-border/30 hover:bg-muted/20 group">
                                  <div className="sticky left-0 z-10 shrink-0 border-r border-border/50 flex bg-primary-foreground" style={{ width: LEFT_COL_WIDTH + KALKYL_COL_WIDTH + HOTEL_COL_WIDTH }}>
                                    <div className="w-72 shrink-0 px-2 py-0.5 pl-7 flex items-center justify-between min-w-0">
                                      <div className="min-w-0 flex items-center gap-1.5">
                                       <div className={cn('h-2 w-2 rounded-full shrink-0', pi.isVacant ? 'bg-destructive' : getBarColor(resourceStatus))} />
                                       <button
                                     className={cn(
                                       'text-xs truncate hover:underline cursor-pointer text-left',
                                       pi.isVacant ? 'text-destructive font-semibold' : 'text-foreground'
                                     )}
                                     onClick={() => {setReassignTarget(pi);setReassignDialogOpen(true);}}
                                     title="Klicka för att byta montör">

                                         {pi.isVacant ? 'Vakant' : pi.installerName || 'Okänd'}
                                       </button>
                                       {!pi.isVacant &&
                                   <span className="text-[9px] text-muted-foreground shrink-0">({pi.installerCompany})</span>
                                   }
                                      </div>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-destructive hover:text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm(`Ta bort ${pi.isVacant ? 'vakant plats' : pi.installerName} och all planerad tid?`)) {
                                            unassignInstaller(pi.id);
                                            toast.success('Montör och planerad tid borttagen');
                                          }
                                        }}
                                        title="Ta bort montör och all tid">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <div className="border-l border-border/50 flex items-center px-1.5" style={{ width: HOTEL_COL_WIDTH }}>
                                      <HotelBookingCell pi={pi} onSave={(updates) => updateHotel(pi.id, updates)} />
                                    </div>
                                  </div>
                                  <div className="flex items-center relative">
                                    {viewMode === 'days' ?
                                renderInstallerDayCells(project.id, pi.id, pi.installerId, resourceStatus) :
                                renderInstallerWeekCells(project.id, pi.id, pi.installerId, resourceStatus)
                                }
                                  </div>
                                </div>
                            )}

                              {pInstallers.length === 0 &&
                            <div className="flex border-b border-border/30">
                                  <div className="sticky left-0 z-10 bg-card shrink-0 border-r border-border/50 flex" style={{ width: LEFT_COL_WIDTH + KALKYL_COL_WIDTH + HOTEL_COL_WIDTH }}>
                                    <div className="w-72 shrink-0 px-2 py-2 pl-7">
                                      <span className="text-[10px] text-muted-foreground italic">Inga montörer kopplade</span>
                                    </div>
                                    <div className="border-l border-border/50" style={{ width: KALKYL_COL_WIDTH }} />
                                    <div className="border-l border-border/50" style={{ width: HOTEL_COL_WIDTH }} />
                                  </div>
                                  <div style={{ width: gridWidth }} />
                                </div>
                            }
                            </motion.div>
                          }
                        </AnimatePresence>
                      </motion.div>);

                  })}

                  {filteredProjects.length === 0 &&
                  <div className="p-6 text-center text-muted-foreground text-sm">
                      {showArchived ? 'Inga arkiverade projekt.' : 'Inga aktiva projekt matchar filtren.'}
                    </div>
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Entry Dialog */}
        <DailyEntryDialog
          open={dailyDialogOpen}
          onOpenChange={setDailyDialogOpen}
          projectId={dailyDialogProject}
          date={dailyDialogDate}
          preselectedProjectInstallerId={dailyDialogProjectInstallerId}
          projectInstallers={getProjectInstallers(dailyDialogProject)}
          existingEntries={getProjectDailyEntries(dailyDialogProject)}
          onSave={async (projectInstallerId, installerId, workHours, travelHours) => {
            await upsertDailyEntry(dailyDialogProject, projectInstallerId, installerId, dailyDialogDate, workHours, travelHours);
            toast.success('Dagpost sparad');
          }} />


        {/* Estimation Dialog */}
        <EditEstimationDialog
          open={estDialogOpen}
          onOpenChange={setEstDialogOpen}
          projectName={estDialogProjectName}
          estimatedInstallHours={getEstimation(estDialogProjectId)?.estimatedInstallHours || 0}
          estimatedTravelHours={getEstimation(estDialogProjectId)?.estimatedTravelHours || 0}
          onSave={async (installH, travelH) => {
            await upsertEstimation(estDialogProjectId, installH, travelH);
            toast.success('Kalkyl sparad');
          }} />


        {/* Reassign Installer Dialog */}
        <ReassignInstallerDialog
          open={reassignDialogOpen}
          onOpenChange={setReassignDialogOpen}
          projectInstaller={reassignTarget}
          installers={installers}
          projectInstallers={reassignTarget ? getProjectInstallers(reassignTarget.projectId) : []}
          onReassign={async (projectInstallerId, newInstallerId, isVacant) => {
            await reassignInstaller(projectInstallerId, newInstallerId, isVacant);
            toast.success(isVacant ? 'Montör markerad som Vakant' : 'Montör bytt');
          }} />

      </motion.div>
    </TooltipProvider>);

}