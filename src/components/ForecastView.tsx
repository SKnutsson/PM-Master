import { useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, AlertTriangle, Loader2, Printer, ChartNoAxesColumnIncreasing, Trophy, Target, Pencil, Check as CheckIcon, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useProjectDataContext, DealStatus, ScheduleChange } from '@/contexts/ProjectDataContext';
import { AddForecastDialog } from './dialogs/AddForecastDialog';
import { EditForecastDialog } from './dialogs/EditForecastDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusLegend } from './StatusLegend';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthShortLabels: {[key: string]: string;} = { May: 'Maj' };
const monthLabels: {[key: string]: string;} = {
  Jan: 'Januari',
  Feb: 'Februari',
  Mar: 'Mars',
  Apr: 'April',
  May: 'Maj',
  Jun: 'Juni',
  Jul: 'Juli',
  Aug: 'Augusti',
  Sep: 'September',
  Oct: 'Oktober',
  Nov: 'November',
  Dec: 'December'
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const getStatusColor = (status: DealStatus) => {
  switch (status) {
    case 'Offert':
      return 'text-blue-400 bg-blue-400/10';
    case 'Order':
      return 'text-status-completed bg-status-completed/10';
    case 'Fakturerad':
      return 'text-emerald-400 bg-emerald-400/10';
    case 'Förlorad':
      return 'text-red-400 bg-red-400/10';
    default:
      return 'text-foreground bg-muted';
  }
};

// Get cell background + text styling based on deal status (for cells with values)
const getCellStatusStyle = (status: DealStatus) => {
  switch (status) {
    case 'Offert':
      return 'bg-blue-600 text-white font-medium';
    case 'Order':
      return 'bg-emerald-600 text-white font-medium';
    case 'Fakturerad':
      return 'bg-emerald-600 text-white font-medium';
    case 'Förlorad':
      return 'bg-red-600 text-white font-medium line-through';
    default:
      return 'text-foreground font-medium';
  }
};

const getMovedFromMonth = (scheduleHistory: ScheduleChange[] | undefined, month: string): ScheduleChange | undefined => {
  if (!scheduleHistory) return undefined;
  return scheduleHistory.find((h) => h.originalMonth === month);
};

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

type PeriodView = '2026' | '2027' | 'rolling12';

export function ForecastView() {
  const { forecast, isLoading, salesTargets, setSalesTarget } = useProjectDataContext();
  const forecastTableRef = useRef<HTMLDivElement>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodView>('2026');
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>('all');

  // Get unique sales persons
  const salesPersons = useMemo(() => {
    const persons = new Set<string>();
    forecast.forEach((f) => {
      if (f.salesPerson) persons.add(f.salesPerson);
    });
    return Array.from(persons).sort();
  }, [forecast]);

  // Filter forecast data based on selected period
  const { filteredForecast, filteredMonthlyTotals, filteredYearTotal, displayMonths, periodLabel } = useMemo(() => {
    const now = new Date();
    const currentMonthIdx = now.getMonth(); // 0-indexed
    const currentYear = now.getFullYear();

    let displayMonths: {month: string;year: number;}[] = [];

    if (selectedPeriod === 'rolling12') {
      // Rolling 12 months from current month
      for (let i = 0; i < 12; i++) {
        const idx = (currentMonthIdx + i) % 12;
        const yr = currentYear + Math.floor((currentMonthIdx + i) / 12);
        displayMonths.push({ month: months[idx], year: yr });
      }
    } else {
      const yr = parseInt(selectedPeriod);
      displayMonths = months.map((m) => ({ month: m, year: yr }));
    }

    // Build filtered months per forecast
    const filteredForecast = forecast.map((f) => {
      const filteredMonths: {[key: string]: number;} = {};
      for (const dm of displayMonths) {
        const entry = f.monthEntries?.find((e) => e.month === dm.month && e.year === dm.year);
        if (entry) {
          filteredMonths[dm.month] = entry.amount;
        }
      }
      return { ...f, months: filteredMonths };
    });

    // Only include forecasts that have at least one entry in the selected period
    const monthOrder = months.reduce((acc, m, i) => ({ ...acc, [m]: i }), {} as Record<string, number>);
    let forecastsInPeriod = filteredForecast.
    filter((f) => Object.values(f.months).some((v) => v > 0)).
    sort((a, b) => {
      const getEarliest = (f: typeof a) => {
        const entries = (f.monthEntries || []).filter((e) => e.amount > 0);
        if (entries.length === 0) return Infinity;
        return Math.min(...entries.map((e) => e.year * 12 + (monthOrder[e.month] ?? 12)));
      };
      return getEarliest(a) - getEarliest(b);
    });

    if (selectedSalesPerson !== 'all') {
      forecastsInPeriod = forecastsInPeriod.filter((f) => f.salesPerson === selectedSalesPerson);
    }

    if (selectedSalesPerson !== 'all') {
      forecastsInPeriod = forecastsInPeriod.filter((f) => f.salesPerson === selectedSalesPerson);
    }

    const activeForecast = forecastsInPeriod.filter((f) => f.dealStatus !== 'Förlorad');
    const filteredMonthlyTotals: {[key: string]: number;} = {};
    for (const dm of displayMonths) {
      const total = activeForecast.reduce((sum, f) => sum + (f.months[dm.month] || 0), 0);
      filteredMonthlyTotals[dm.month] = total;
    }
    const filteredYearTotal = Object.values(filteredMonthlyTotals).reduce((s, v) => s + v, 0);

    const periodLabel = selectedPeriod === 'rolling12' ?
    'Rullande 12 månader' :
    `Försäljningsbudget ${selectedPeriod}`;

    return { filteredForecast: forecastsInPeriod, filteredMonthlyTotals, filteredYearTotal, displayMonths, periodLabel };
  }, [forecast, selectedPeriod, selectedSalesPerson]);

  const chartData = displayMonths.map((dm) => ({
    month: monthLabels[dm.month] || dm.month,
    value: filteredMonthlyTotals[dm.month] || 0
  }));

  let cumulative = 0;
  const cumulativeData = chartData.map((item) => {
    cumulative += item.value;
    return { ...item, cumulative };
  });

  const bestMonth = Object.entries(filteredMonthlyTotals).reduce(
    (best, [month, value]) => value > best.value ? { month, value } : best,
    { month: '', value: 0 }
  );

  const activeDeals = filteredForecast.filter((f) => f.dealStatus !== 'Förlorad').length;
  const lostDeals = filteredForecast.filter((f) => f.dealStatus === 'Förlorad').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>);

  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{periodLabel}</h1>
          <p className="text-muted-foreground">
            Översikt av budgeterad försäljning per månad
            
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as PeriodView)}>
            <TabsList>
              <TabsTrigger value="2026">2026</TabsTrigger>
              <TabsTrigger value="2027">2027</TabsTrigger>
              <TabsTrigger value="rolling12">Rullande 12 mån</TabsTrigger>
            </TabsList>
          </Tabs>
          <AddForecastDialog />
        </div>
      </div>

      {/* Sales Target Input — always visible */}
      {(() => {
        const yr = selectedPeriod === 'rolling12' ? new Date().getFullYear() : parseInt(selectedPeriod);
        const currentTarget = salesTargets[yr] || 0;
        return (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Försäljningsmål {yr}:</span>
            </div>
            {editingTarget ?
            <div className="flex items-center gap-2">
                <Input
                type="number"
                step="0.1"
                min="0"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="MSEK"
                className="w-28 h-8 text-sm" />
                <span className="text-sm text-muted-foreground">MSEK</span>
                <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={async () => {
                  const val = parseFloat(targetInput);
                  if (!isNaN(val) && val >= 0) {
                    await setSalesTarget(yr, val);
                  }
                  setEditingTarget(false);
                }}>
                  <CheckIcon className="h-4 w-4" />
                </Button>
              </div> :
            <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{currentTarget > 0 ? `${currentTarget.toFixed(1)} MSEK` : 'Ej satt'}</span>
                <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setTargetInput(currentTarget > 0 ? String(currentTarget) : '');
                  setEditingTarget(true);
                }}>
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            }
          </div>);
      })()}

      {/* Summary Cards — Dashboard-style gradient hero cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={itemVariants} className="flex">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(168_30%_16%)] to-[hsl(168_40%_10%)] p-6 shadow-md transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg w-full flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-10 translate-x-10" />
            <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 translate-y-8 -translate-x-8" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/60 uppercase tracking-wider">Total budget</p>
                <p className="text-3xl font-bold text-white mt-1">{filteredYearTotal.toFixed(1)} MSEK</p>
                <p className="text-xs text-white/40 mt-1">Exkl. förlorade affärer</p>
              </div>
              <div className="rounded-xl p-3 bg-white/10 backdrop-blur-sm">
                <ChartNoAxesColumnIncreasing className="h-7 w-7 text-white/80" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="flex">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(160_55%_36%)] to-[hsl(160_55%_26%)] p-6 shadow-md transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg w-full flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-10 translate-x-10" />
            <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 translate-y-8 -translate-x-8" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/60 uppercase tracking-wider">Bästa månad</p>
                <p className="text-3xl font-bold text-white mt-1">{monthLabels[bestMonth.month] || '-'}</p>
                <p className="text-xs text-white/40 mt-1">{bestMonth.value.toFixed(1)} MSEK</p>
              </div>
              <div className="rounded-xl p-3 bg-white/10 backdrop-blur-sm">
                <Trophy className="h-7 w-7 text-white/80" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="flex">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(160_25%_50%)] to-[hsl(160_20%_38%)] p-6 shadow-md transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg w-full flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-10 translate-x-10" />
            <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 translate-y-8 -translate-x-8" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/60 uppercase tracking-wider">Aktiva affärer</p>
                <p className="text-3xl font-bold text-white mt-1">{activeDeals}</p>
              </div>
              <div className="rounded-xl p-3 bg-white/10 backdrop-blur-sm">
                <Package className="h-7 w-7 text-white/80" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="flex">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(0_45%_45%)] to-[hsl(0_40%_32%)] p-6 shadow-md transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg w-full flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-10 translate-x-10" />
            <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 translate-y-8 -translate-x-8" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/60 uppercase tracking-wider">Förlorade affärer</p>
                <p className="text-3xl font-bold text-white mt-1">{lostDeals}</p>
              </div>
              <div className="rounded-xl p-3 bg-white/10 backdrop-blur-sm">
                <AlertTriangle className="h-7 w-7 text-white/80" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Legend */}
      <motion.div variants={itemVariants}>
        <StatusLegend
          items={[
          { color: 'bg-blue-600', label: 'Offert' },
          { color: 'bg-emerald-600', label: 'Order' },
          { color: 'bg-emerald-600', label: 'Fakturerad' },
          { color: 'bg-yellow-400', label: 'Flyttad' },
          { color: 'bg-red-600', label: 'Förlorad' },
          { color: 'bg-foreground/50', label: 'Budget' }]
          } />

      </motion.div>

      {/* Forecast Table */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Detaljerad budget</CardTitle>
                <CardDescription>Belopp färgkodas per cell baserat på affärsstatus</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {salesPersons.length > 0 &&
                <Select value={selectedSalesPerson} onValueChange={setSelectedSalesPerson}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <Filter className="h-3 w-3 mr-1" />
                      <SelectValue placeholder="Filtrera säljare" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alla säljare</SelectItem>
                      {salesPersons.map((sp) =>
                    <SelectItem key={sp} value={sp}>{sp}</SelectItem>
                    )}
                    </SelectContent>
                  </Select>
                }
                <Button variant="ghost" size="icon" onClick={() => printSection(forecastTableRef.current, `Detaljerad Försäljningsbudget`)} className="print:hidden h-8 w-8">
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div ref={forecastTableRef} className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  {/* Quarter header row */}
                  {selectedPeriod !== 'rolling12' &&
                  <tr className="bg-sidebar-accent/60">
                      <th colSpan={3} className="py-0.5 px-3 bg-secondary-foreground"></th>
                      {[1, 2, 3, 4].map((q) =>
                    <th
                      key={q}
                      colSpan={3}
                      className="text-center font-bold uppercase tracking-widest py-0.5 border-l border-white/30 text-primary-foreground text-sm bg-secondary-foreground">
                      
                          Q{q}
                        </th>
                    )}
                      <th colSpan={2} className="py-0.5 border-l border-white/30 bg-secondary-foreground"></th>
                    </tr>
                  }
                  <tr className="bg-sidebar-accent text-primary-foreground">
                    <th className="text-left font-semibold py-1.5 px-3 text-xs tracking-wide">Projekt</th>
                    <th className="text-left font-semibold py-1.5 px-3 text-xs tracking-wide">Produkt</th>
                    <th className="text-left font-semibold py-1.5 px-3 text-xs tracking-wide">Status</th>
                    {displayMonths.map((dm, i) => {
                      const isQuarterStart = !!(selectedPeriod !== 'rolling12' && i % 3 === 0);
                      return (
                        <th key={`${dm.month}-${dm.year}-${i}`} className={cn(
                          "text-center font-semibold py-1.5 px-0 w-[36px] min-w-[36px] max-w-[36px] tracking-wide border-l text-xs",
                          isQuarterStart ? "border-l-white/60" : "border-l-white/30"
                        )}>
                          {monthShortLabels[dm.month] || dm.month}
                          {selectedPeriod === 'rolling12' && <span className="block text-[9px] opacity-60">{dm.year}</span>}
                        </th>);

                    })}
                    <th className="text-left font-semibold py-1.5 px-3 text-xs tracking-wide border-l border-white/40">Notering</th>
                    <th className="w-8 py-1.5 px-1"></th>
                  </tr>
                </thead>
                <tbody>
                  <TooltipProvider>
                    {filteredForecast.map((item, rowIdx) => {
                      const isLost = item.dealStatus === 'Förlorad';
                      const rowTotal = Object.values(item.months).reduce((s, v) => s + v, 0);

                      return (
                        <tr
                          key={item.id}
                          className={cn(
                            "group transition-all duration-150 hover:bg-primary/[0.04]",
                            rowIdx % 2 === 0 ? "bg-background" : "bg-muted/20",
                            isLost && "opacity-50"
                          )}>
                          
                          <td className={cn("py-0 px-3 text-xs font-medium border-b border-border/40", isLost && "line-through")}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{item.project}</span>
                            </div>
                          </td>
                          <td className="py-0 px-3 text-muted-foreground border-b border-border/40 text-sm">{item.product}</td>
                          <td className="py-0 px-3 border-b border-border/40">
                            <span className={cn("inline-flex items-center leading-none px-2.5 whitespace-nowrap text-xs font-semibold text-left mx-0 py-[5px] rounded-full",

                            getStatusColor(item.dealStatus)
                            )}>
                              {item.dealStatus}
                            </span>
                          </td>
                          {displayMonths.map((dm, i) => {
                            const movedFrom = getMovedFromMonth(item.scheduleHistory, dm.month);
                            const hasValue = item.months[dm.month] && item.months[dm.month] > 0;
                            const isQuarterStart = !!(selectedPeriod !== 'rolling12' && i % 3 === 0);

                            return (
                              <td
                                key={`${dm.month}-${dm.year}-${i}`}
                                className={cn(
                                  "text-center relative py-0 px-0 text-[10px] w-[36px] min-w-[36px] max-w-[36px] border-b border-border/40 border-l transition-colors",
                                  isQuarterStart ? "border-l-border" : "border-l-border/50",
                                  hasValue && "font-semibold",
                                  movedFrom && !hasValue && "bg-yellow-400/10"
                                )}>
                                
                                {movedFrom && !hasValue &&
                                <UITooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-yellow-500 cursor-help text-xs font-semibold">
                                        ({movedFrom.originalAmount.toFixed(2)})
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Flyttad till {monthLabels[movedFrom.newMonth]}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Ursprungligt belopp: {movedFrom.originalAmount.toFixed(2)} MSEK
                                      </p>
                                    </TooltipContent>
                                  </UITooltip>
                                }
                                {hasValue &&
                                <span className={cn("inline-flex items-center justify-center rounded px-1 min-w-[30px] py-[5px] text-xs font-semibold",

                                getCellStatusStyle(item.dealStatus)
                                )}>
                                    {item.months[dm.month].toFixed(2)}
                                  </span>
                                }
                                {!movedFrom && !hasValue &&
                                <span className="text-muted-foreground/20">–</span>
                                }
                              </td>);

                          })}
                          <td className="text-xs text-muted-foreground py-0 px-3 max-w-[120px] border-b border-border/40 border-l border-l-border/50 bg-inherit">
                            {item.notes ?
                            <UITooltip>
                                <TooltipTrigger asChild>
                                  <span className="block truncate cursor-default">{item.notes}</span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[300px] whitespace-normal">
                                  <p>{item.notes}</p>
                                </TooltipContent>
                              </UITooltip> :

                            <span className="text-muted-foreground/30">–</span>
                            }
                          </td>
                          <td className="py-0 px-1 border-b border-border/40 bg-inherit">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <EditForecastDialog forecast={item} />
                            </div>
                          </td>
                        </tr>);

                    })}
                  </TooltipProvider>
                  {filteredForecast.length === 0 &&
                  <tr>
                      <td colSpan={16} className="text-center py-10 text-muted-foreground text-sm">
                        Inga affärer ännu. Klicka på "Ny affär" för att börja.
                      </td>
                    </tr>
                  }
                  {/* Totals row */}
                  {filteredForecast.length > 0 &&
                  <tr className="bg-sidebar-accent/80 text-primary-foreground font-bold">
                      <td colSpan={3} className="py-1.5 px-3 text-xs">
                        Summa per månad
                        <span className="text-xs font-normal opacity-60 ml-2">(exkl. förlorade)</span>
                      </td>
                      {displayMonths.map((dm, i) => {
                      const isQuarterStart = !!(selectedPeriod !== 'rolling12' && i % 3 === 0);
                      return (
                        <td key={`total-${dm.month}-${dm.year}-${i}`} className={cn(
                          "text-center py-1.5 px-0 w-[36px] min-w-[36px] max-w-[36px] border-l text-xs font-semibold",
                          isQuarterStart ? "border-l-white/60" : "border-l-white/30"
                        )}>
                            {(filteredMonthlyTotals[dm.month] || 0) > 0 ? (filteredMonthlyTotals[dm.month] || 0).toFixed(1) : '–'}
                          </td>);

                    })}
                      <td className="py-1.5 px-3"></td>
                      <td className="py-1.5 px-1"></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>);

}