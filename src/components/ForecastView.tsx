import { useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, AlertTriangle, Loader2, Printer, ChartNoAxesColumnIncreasing, Trophy, Target, Pencil, Check as CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useProjectDataContext, DealStatus, ScheduleChange } from '@/contexts/ProjectDataContext';
import { AddForecastDialog } from './dialogs/AddForecastDialog';
import { EditForecastDialog } from './dialogs/EditForecastDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusLegend } from './StatusLegend';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
    const forecastsInPeriod = filteredForecast
      .filter((f) => Object.values(f.months).some((v) => v > 0))
      .sort((a, b) => {
        const getEarliest = (f: typeof a) => {
          const entries = (f.monthEntries || []).filter(e => e.amount > 0);
          if (entries.length === 0) return Infinity;
          return Math.min(...entries.map(e => e.year * 12 + (monthOrder[e.month] ?? 12)));
        };
        return getEarliest(a) - getEarliest(b);
      });
    const activeForecast = forecastsInPeriod.filter((f) => f.dealStatus !== 'Förlorad');
    const filteredMonthlyTotals: {[key: string]: number;} = {};
    for (const dm of displayMonths) {
      const total = activeForecast.reduce((sum, f) => sum + (f.months[dm.month] || 0), 0);
      filteredMonthlyTotals[dm.month] = total;
    }
    const filteredYearTotal = Object.values(filteredMonthlyTotals).reduce((s, v) => s + v, 0);

    const periodLabel = selectedPeriod === 'rolling12' ?
    'Rullande 12 månader' :
    `Försäljningsprognos ${selectedPeriod}`;

    return { filteredForecast: forecastsInPeriod, filteredMonthlyTotals, filteredYearTotal, displayMonths, periodLabel };
  }, [forecast, selectedPeriod]);

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
            Översikt av prognostiserad försäljning per månad
            
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

      {/* Sales Target Input */}
      {selectedPeriod !== 'rolling12' && (() => {
        const yr = parseInt(selectedPeriod);
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
                <p className="text-sm font-medium text-white/60 uppercase tracking-wider">Total prognos</p>
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

      {/* Chart */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle>Månatlig och kumulativ prognos</CardTitle>
            <CardDescription>Försäljning i MSEK per månad (exkl. förlorade affärer)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }} />

                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorValue)" name="Månad (MSEK)" />
                  <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorCumulative)" name="Kumulativt (MSEK)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

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
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Detaljerad prognos</CardTitle>
                <CardDescription>Belopp färgkodas per cell baserat på affärsstatus</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => printSection(forecastTableRef.current, `Detaljerad Försäljningsprognos`)} className="print:hidden h-8 w-8">
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={forecastTableRef} className="overflow-x-auto">
              <Table>
                <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                     <TableHead className="font-semibold py-1 px-2 text-xs">Projekt</TableHead>
                     <TableHead className="font-semibold py-1 px-2 text-xs">Produkt</TableHead>
                     <TableHead className="font-semibold py-1 px-2 text-xs">Status</TableHead>
                     {displayMonths.map((dm, i) =>
                    <TableHead key={`${dm.month}-${dm.year}-${i}`} className="text-center font-semibold py-1 px-1 text-xs w-[60px] min-w-[60px] max-w-[60px]">
                         {dm.month}
                         {selectedPeriod === 'rolling12' && <span className="block text-[9px] text-muted-foreground">{dm.year}</span>}
                       </TableHead>
                    )}
                     <TableHead className="font-semibold py-1 px-2 text-xs">Notering</TableHead>
                     <TableHead className="w-8 py-1 px-1"></TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  <TooltipProvider>
                    {filteredForecast.map((item) => {
                      const isLost = item.dealStatus === 'Förlorad';

                      return (
                        <TableRow
                          key={item.id}
                          className="border-border/30 h-7">

                          <TableCell className={cn("font-medium py-0 px-2 text-xs", isLost && "line-through opacity-70")}>
                            {item.project}
                          </TableCell>
                          <TableCell className="text-muted-foreground py-0 px-2 text-xs">{item.product}</TableCell>
                          <TableCell className="py-0 px-2">
                            <span className={cn("inline-flex items-center rounded-full text-xs leading-none ml-0 font-medium px-[15px] py-[7px] text-center",

                            getStatusColor(item.dealStatus)
                            )}>
                              {item.dealStatus}
                            </span>
                          </TableCell>
                          {displayMonths.map((dm, i) => {
                            const movedFrom = getMovedFromMonth(item.scheduleHistory, dm.month);
                            const hasValue = item.months[dm.month] && item.months[dm.month] > 0;

                            return (
                              <TableCell
                                key={`${dm.month}-${dm.year}-${i}`}
                                className={cn(
                                  "text-center relative py-0 px-1 text-xs",
                                  hasValue && getCellStatusStyle(item.dealStatus),
                                  movedFrom && !hasValue && "bg-yellow-400/20"
                                )}>

                                {movedFrom && !hasValue &&
                                <UITooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-yellow-500 font-medium cursor-help">
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
                                <span>
                                    {item.months[dm.month].toFixed(2)}
                                  </span>
                                }
                                {!movedFrom && !hasValue &&
                                <span className="text-muted-foreground/30"></span>
                                }
                              </TableCell>);

                          })}
                          <TableCell className="text-xs text-muted-foreground py-0 px-2 max-w-[120px]">
                            {item.notes ? (
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <span className="block truncate cursor-default">{item.notes}</span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[300px] whitespace-normal">
                                  <p>{item.notes}</p>
                                </TooltipContent>
                              </UITooltip>
                            ) : (
                              <span className="block truncate">-</span>
                            )}
                          </TableCell>
                          <TableCell className="py-0 px-1">
                            <EditForecastDialog forecast={item} />
                          </TableCell>
                        </TableRow>);

                    })}
                  </TooltipProvider>
                  {filteredForecast.length === 0 &&
                  <TableRow>
                      <TableCell colSpan={16} className="text-center py-6 text-muted-foreground text-xs">
                        Inga affärer ännu. Klicka på "Ny affär" för att börja.
                      </TableCell>
                    </TableRow>
                  }
                  {/* Totals row */}
                  {filteredForecast.length > 0 &&
                  <TableRow className="border-t-2 border-border bg-muted/30 font-bold h-7">
                       <TableCell colSpan={3} className="py-0 px-2 text-xs">
                         Summa per månad
                         <span className="text-xs font-normal text-muted-foreground ml-2">(exkl. förlorade)</span>
                       </TableCell>
                       {displayMonths.map((dm, i) =>
                    <TableCell key={`total-${dm.month}-${dm.year}-${i}`} className="text-center text-primary py-0 px-1 text-xs">
                           {(filteredMonthlyTotals[dm.month] || 0).toFixed(1)}
                         </TableCell>
                    )}
                       <TableCell className="py-0 px-2"></TableCell>
                       <TableCell className="py-0 px-1"></TableCell>
                     </TableRow>
                  }
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>);

}