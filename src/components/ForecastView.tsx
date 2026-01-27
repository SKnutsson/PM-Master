import { motion } from 'framer-motion';
import { TrendingUp, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { salesForecast, monthlyTotals, yearTotal } from '@/data/projectData';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function ForecastView() {
  const chartData = Object.entries(monthlyTotals).map(([month, value]) => ({
    month: monthLabels[month] || month,
    value,
  }));

  // Calculate cumulative data
  let cumulative = 0;
  const cumulativeData = chartData.map(item => {
    cumulative += item.value;
    return { ...item, cumulative };
  });

  // Group by product
  const productGroups = salesForecast.reduce((acc, item) => {
    if (!acc[item.product]) {
      acc[item.product] = [];
    }
    acc[item.product].push(item);
    return acc;
  }, {} as { [key: string]: typeof salesForecast });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-6"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Försäljningsprognos 2026</h1>
        <p className="text-muted-foreground">Översikt av prognostiserad försäljning per månad</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total prognos</p>
                  <p className="mt-1 text-3xl font-bold">{yearTotal} MSEK</p>
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
                  <p className="mt-1 text-3xl font-bold">Maj</p>
                  <p className="text-sm text-muted-foreground">14.0 MSEK</p>
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
                  <p className="text-sm text-muted-foreground">Antal projekt</p>
                  <p className="mt-1 text-3xl font-bold">{salesForecast.length}</p>
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
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    name="Månad (MSEK)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cumulative" 
                    stroke="hsl(var(--chart-2))"
                    fillOpacity={1}
                    fill="url(#colorCumulative)"
                    name="Kumulativt (MSEK)"
                  />
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
                    {months.map(month => (
                      <TableHead key={month} className="text-center font-semibold">
                        {month}
                      </TableHead>
                    ))}
                    <TableHead className="font-semibold">Not</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesForecast.map((item, index) => (
                    <TableRow key={index} className="border-border/50">
                      <TableCell className="font-medium">{item.project}</TableCell>
                      <TableCell className="text-muted-foreground">{item.product}</TableCell>
                      {months.map(month => (
                        <TableCell key={month} className="text-center">
                          {item.months[month] ? (
                            <span className="font-medium text-primary">
                              {item.months[month].toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-sm text-muted-foreground">
                        {item.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="border-t-2 border-border bg-muted/30 font-bold">
                    <TableCell colSpan={2}>Summa per månad</TableCell>
                    {months.map(month => (
                      <TableCell key={month} className="text-center text-primary">
                        {monthlyTotals[month as keyof typeof monthlyTotals]?.toFixed(1) || '-'}
                      </TableCell>
                    ))}
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
