import { motion } from 'framer-motion';
import { TrendingUp, Package, Pencil } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProjectDataContext, DealStatus } from '@/contexts/ProjectDataContext';
import { AddForecastDialog } from './dialogs/AddForecastDialog';
import { EditForecastDialog } from './dialogs/EditForecastDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabels: {
  [key: string]: string;
} = {
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
  hidden: {
    opacity: 0
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};
const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0
  }
};
const getStatusColor = (status: DealStatus) => {
  switch (status) {
    case 'Tagen':
      return 'text-status-completed bg-status-completed/10';
    case 'Flyttad':
      return 'text-status-in-progress bg-status-in-progress/10';
    case 'Förlorad':
      return 'text-status-delayed bg-status-delayed/10';
    default:
      return 'text-muted-foreground bg-muted';
  }
};
export function ForecastView() {
  const {
    forecast,
    monthlyTotals,
    yearTotal
  } = useProjectDataContext();
  const chartData = months.map(month => ({
    month: monthLabels[month] || month,
    value: monthlyTotals[month] || 0
  }));

  // Calculate cumulative data
  let cumulative = 0;
  const cumulativeData = chartData.map(item => {
    cumulative += item.value;
    return {
      ...item,
      cumulative
    };
  });

  // Find best month
  const bestMonth = Object.entries(monthlyTotals).reduce((best, [month, value]) => value > best.value ? {
    month,
    value
  } : best, {
    month: '',
    value: 0
  });
  return <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Försäljningsprognos 2026</h1>
          <p className="text-muted-foreground">Översikt av prognostiserad försäljning per månad</p>
        </div>
        <AddForecastDialog />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total prognos</p>
                  <p className="mt-1 text-3xl font-bold">{yearTotal.toFixed(1)} MSEK</p>
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
                  <p className="text-sm text-muted-foreground">Antal affärer</p>
                  <p className="mt-1 text-3xl font-bold">{forecast.length}</p>
                </div>
                <div className="rounded-full bg-chart-4/10 p-3">
                  <Package className="h-6 w-6 text-chart-4" />
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
            <CardDescription>Försäljning i MSEK per månad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%" className="border-primary">
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
                  <Tooltip contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} labelStyle={{
                  color: 'hsl(var(--foreground))'
                }} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorValue)" name="Månad (MSEK)" />
                  <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorCumulative)" name="Kumulativt (MSEK)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Forecast Table */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle>Detaljerad prognos</CardTitle>
            <CardDescription>Alla projekt och produkter</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="font-semibold">Projekt</TableHead>
                    <TableHead className="font-semibold">Produkt</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    {months.map(month => <TableHead key={month} className="text-center font-semibold">
                        {month}
                      </TableHead>)}
                    <TableHead className="font-semibold">Not</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecast.map(item => <TableRow key={item.id} className="border-border/50">
                      <TableCell className="font-medium">{item.project}</TableCell>
                      <TableCell className="text-muted-foreground">{item.product}</TableCell>
                      <TableCell>
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(item.dealStatus))}>
                          {item.dealStatus}
                        </span>
                      </TableCell>
                      {months.map(month => <TableCell key={month} className="text-center">
                          {item.months[month] ? <span className="font-medium text-primary">
                              {item.months[month].toFixed(2)}
                            </span> : <span className="text-muted-foreground/30">-</span>}
                        </TableCell>)}
                      <TableCell className="text-sm text-muted-foreground">
                        {item.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <EditForecastDialog forecast={item} />
                      </TableCell>
                    </TableRow>)}
                  {forecast.length === 0 && <TableRow>
                      <TableCell colSpan={16} className="text-center py-8 text-muted-foreground">
                        Inga affärer ännu. Klicka på "Ny affär" för att börja.
                      </TableCell>
                    </TableRow>}
                  {/* Totals row */}
                  {forecast.length > 0 && <TableRow className="border-t-2 border-border bg-muted/30 font-bold">
                      <TableCell colSpan={3}>Summa per månad</TableCell>
                      {months.map(month => <TableCell key={month} className="text-center text-primary">
                          {(monthlyTotals[month] || 0).toFixed(1)}
                        </TableCell>)}
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </TableRow>}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>;
}