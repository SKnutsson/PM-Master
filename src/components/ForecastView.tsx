import { motion } from 'framer-motion';
import { TrendingUp, Package, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjectDataContext, DealStatus, ScheduleChange } from '@/contexts/ProjectDataContext';
import { AddForecastDialog } from './dialogs/AddForecastDialog';
import { EditForecastDialog } from './dialogs/EditForecastDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusLegend } from './StatusLegend';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabels: { [key: string]: string } = {
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
    case 'Ny affär':
      return 'text-blue-400 bg-blue-400/10';
    case 'Tagen':
      return 'text-status-completed bg-status-completed/10';
    case 'Flyttad':
      return 'text-yellow-400 bg-yellow-400/10';
    case 'Förlorad':
      return 'text-red-400 bg-red-400/10';
    default: // Prognos
      return 'text-foreground bg-muted';
  }
};

// Get the amount text color based on deal status
const getAmountColor = (status: DealStatus) => {
  switch (status) {
    case 'Ny affär':
      return 'text-blue-400';
    case 'Tagen':
      return 'text-status-completed';
    case 'Förlorad':
      return 'text-red-400 line-through';
    default: // Prognos
      return 'text-foreground';
  }
};

// Check if a month was the original scheduled month (project was moved FROM this month)
const getMovedFromMonth = (scheduleHistory: ScheduleChange[] | undefined, month: string): ScheduleChange | undefined => {
  if (!scheduleHistory) return undefined;
  return scheduleHistory.find(h => h.originalMonth === month);
};

// Check if this is a lost deal's original month
const isLostDealMonth = (dealStatus: DealStatus, months: { [key: string]: number }, month: string): boolean => {
  if (dealStatus !== 'Förlorad') return false;
  return months[month] !== undefined && months[month] > 0;
};

export function ForecastView() {
  const { forecast, monthlyTotals, yearTotal, isLoading } = useProjectDataContext();

  const chartData = months.map(month => ({
    month: monthLabels[month] || month,
    value: monthlyTotals[month] || 0
  }));

  // Calculate cumulative data
  let cumulative = 0;
  const cumulativeData = chartData.map(item => {
    cumulative += item.value;
    return { ...item, cumulative };
  });

  // Find best month
  const bestMonth = Object.entries(monthlyTotals).reduce(
    (best, [month, value]) => (value > best.value ? { month, value } : best),
    { month: '', value: 0 }
  );

  // Count active deals (excluding lost)
  const activeDeals = forecast.filter(f => f.dealStatus !== 'Förlorad').length;
  const lostDeals = forecast.filter(f => f.dealStatus === 'Förlorad').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Försäljningsprognos 2026</h1>
          <p className="text-muted-foreground">
            Översikt av prognostiserad försäljning per månad
            <span className="ml-2 text-xs text-status-completed">(Autospar aktiverat)</span>
          </p>
        </div>
        <AddForecastDialog />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total prognos</p>
                  <p className="mt-1 text-3xl font-bold">{yearTotal.toFixed(1)} MSEK</p>
                  <p className="text-xs text-muted-foreground mt-1">Exkl. förlorade affärer</p>
                </div>
                <div className="rounded-full bg-primary/10 p-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bästa månad</p>
                  <p className="mt-1 text-3xl font-bold">{monthLabels[bestMonth.month] || '-'}</p>
                  <p className="text-sm text-muted-foreground">{bestMonth.value.toFixed(1)} MSEK</p>
                </div>
                <div className="rounded-full bg-status-completed/10 p-3">
                  <TrendingUp className="h-6 w-6 text-status-completed" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aktiva affärer</p>
                  <p className="mt-1 text-3xl font-bold">{activeDeals}</p>
                </div>
                <div className="rounded-full bg-chart-4/10 p-3">
                  <Package className="h-6 w-6 text-chart-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Förlorade affärer</p>
                  <p className="mt-1 text-3xl font-bold text-status-delayed">{lostDeals}</p>
                </div>
                <div className="rounded-full bg-status-delayed/10 p-3">
                  <AlertTriangle className="h-6 w-6 text-status-delayed" />
                </div>
              </div>
            </CardContent>
          </Card>
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
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
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
            { color: 'bg-blue-400', label: 'Ny affär' },
            { color: 'bg-status-completed', label: 'Tagen' },
            { color: 'bg-yellow-400', label: 'Flyttad (ursprunglig månad)' },
            { color: 'bg-status-delayed', label: 'Förlorad (ej i summor)' },
            { color: 'bg-foreground/50', label: 'Prognos' },
          ]}
        />
      </motion.div>

      {/* Forecast Table */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle>Detaljerad prognos</CardTitle>
            <CardDescription>Alla projekt och produkter - gul markering visar ursprunglig månad för flyttade projekt</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                     <TableHead className="font-semibold py-2 px-3 text-xs">Projekt</TableHead>
                     <TableHead className="font-semibold py-2 px-3 text-xs">Produkt</TableHead>
                     <TableHead className="font-semibold py-2 px-3 text-xs">Status</TableHead>
                     {months.map(month => (
                       <TableHead key={month} className="text-center font-semibold py-2 px-2 text-xs">{month}</TableHead>
                     ))}
                     <TableHead className="font-semibold py-2 px-3 text-xs">Not</TableHead>
                     <TableHead className="w-10 py-2 px-2"></TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  <TooltipProvider>
                    {forecast.map(item => {
                      const isLost = item.dealStatus === 'Förlorad';
                      
                      return (
                        <TableRow 
                          key={item.id} 
                          className={cn(
                            "border-border/50",
                            isLost && "bg-status-delayed/5 opacity-70"
                          )}
                        >
                          <TableCell className={cn("font-medium py-1.5 px-3 text-sm", isLost && "line-through")}>
                            {item.project}
                          </TableCell>
                          <TableCell className="text-muted-foreground py-1.5 px-3 text-sm">{item.product}</TableCell>
                          <TableCell className="py-1.5 px-3">
                            <span className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                              getStatusColor(item.dealStatus)
                            )}>
                              {item.dealStatus}
                            </span>
                          </TableCell>
                          {months.map(month => {
                            const movedFrom = getMovedFromMonth(item.scheduleHistory, month);
                            const hasValue = item.months[month] && item.months[month] > 0;
                            const isLostMonth = isLostDealMonth(item.dealStatus, item.months, month);

                            return (
                              <TableCell 
                                key={month} 
                                className={cn(
                                  "text-center relative py-1.5 px-2 text-sm",
                                  movedFrom && !hasValue && "bg-yellow-400/10 border-l-2 border-yellow-400",
                                  isLostMonth && "bg-red-400/10 border-l-2 border-red-400"
                                )}
                              >
                                {movedFrom && !hasValue && (
                                  <UITooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-yellow-400 font-medium cursor-help">
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
                                )}
                                {hasValue && (
                                  <span className={cn(
                                    "font-medium",
                                    getAmountColor(item.dealStatus)
                                  )}>
                                    {item.months[month].toFixed(2)}
                                  </span>
                                )}
                                {!movedFrom && !hasValue && (
                                  <span className="text-muted-foreground/30">-</span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-sm text-muted-foreground py-1.5 px-3">
                            {item.notes || '-'}
                          </TableCell>
                          <TableCell className="py-1.5 px-2">
                            <EditForecastDialog forecast={item} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TooltipProvider>
                  {forecast.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={16} className="text-center py-8 text-muted-foreground">
                        Inga affärer ännu. Klicka på "Ny affär" för att börja.
                      </TableCell>
                    </TableRow>
                  )}
                  {/* Totals row - excludes lost deals */}
                  {forecast.length > 0 && (
                    <TableRow className="border-t-2 border-border bg-muted/30 font-bold">
                       <TableCell colSpan={3} className="py-1.5 px-3 text-sm">
                         Summa per månad
                         <span className="text-xs font-normal text-muted-foreground ml-2">(exkl. förlorade)</span>
                       </TableCell>
                       {months.map(month => (
                         <TableCell key={month} className="text-center text-primary py-1.5 px-2 text-sm">
                           {(monthlyTotals[month] || 0).toFixed(1)}
                         </TableCell>
                       ))}
                       <TableCell className="py-1.5 px-3"></TableCell>
                       <TableCell className="py-1.5 px-2"></TableCell>
                     </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
