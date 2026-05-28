import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChartNoAxesColumnIncreasing, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { YearNavigator } from './YearNavigator';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function AnimatedNumber({ value, duration = 900, decimals = 0 }: { value: number; duration?: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  return <>{decimals > 0 ? display.toFixed(decimals) : Math.round(display)}</>;
}

export function SalesOverviewPanel() {
  const { forecast, salesTargets } = useProjectDataContext();
  const [chartPeriod, setChartPeriod] = useState<string>(String(new Date().getFullYear()));

  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const currentYear = now.getFullYear();

  const chartLabels: { month: string; year: number }[] = (() => {
    if (chartPeriod === 'rolling') {
      const labels: { month: string; year: number }[] = [];
      for (let i = 0; i < 12; i++) {
        const idx = (currentMonthIndex + i) % 12;
        const yr = currentYear + Math.floor((currentMonthIndex + i) / 12);
        labels.push({ month: months[idx], year: yr });
      }
      return labels;
    }
    const yr = parseInt(chartPeriod);
    return months.map((m) => ({ month: m, year: yr }));
  })();

  const chartData = chartLabels.map(({ month, year }) => {
    let fakturerad = 0, order = 0, budget = 0, offert = 0;
    forecast.forEach((f) => {
      if (f.dealStatus === 'Förlorad') return;
      const entries = (f.monthEntries || []).filter((e) => e.year === year && e.month === month);
      const sum = entries.reduce((s, e) => s + e.amount, 0);
      if (f.dealStatus === 'Fakturerad') fakturerad += sum;
      else if (f.dealStatus === 'Order') order += sum;
      else if (f.dealStatus === 'Budget') budget += sum;
      else if (f.dealStatus === 'Offert') offert += sum;
    });
    const label = chartPeriod === 'rolling' ? `${month} ${String(year).slice(2)}` : month;
    return { month: label, fakturerad, order, budget, offert };
  });

  const chartYearTotal = chartData.reduce((s, d) => s + d.fakturerad + d.order + d.budget + d.offert, 0);
  const targetYear = chartPeriod === 'rolling' ? currentYear : parseInt(chartPeriod);
  const salesTarget = salesTargets[targetYear] || 0;
  const takenTotal = chartData.reduce((s, d) => s + d.fakturerad + d.order, 0);
  const pct = salesTarget > 0 ? Math.min((takenTotal / salesTarget) * 100, 100) : 0;
  const periodLabel = chartPeriod === 'rolling' ? 'Rullande 12 mån' : chartPeriod;

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-[3fr_1fr]">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border/50 bg-card/90 h-full flex flex-col overflow-hidden">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Försäljningsöversikt</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <YearNavigator value={chartPeriod} onChange={setChartPeriod} />
                <div className="text-right ml-2">
                  <p className="text-3xl font-bold text-primary">
                    <AnimatedNumber value={chartYearTotal} decimals={1} duration={1200} />
                  </p>
                  <p className="text-xs text-muted-foreground">Total MSEK</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pb-4">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} stackOffset="none">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const fakturerad = (payload.find(p => p.dataKey === 'fakturerad')?.value as number) || 0;
                      const order = (payload.find(p => p.dataKey === 'order')?.value as number) || 0;
                      const budget = (payload.find(p => p.dataKey === 'budget')?.value as number) || 0;
                      const offert = (payload.find(p => p.dataKey === 'offert')?.value as number) || 0;
                      const total = fakturerad + order + budget + offert;
                      return (
                        <div style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', padding: '10px 14px' }}>
                          <p style={{ fontWeight: 600, fontSize: 13, color: 'hsl(var(--foreground))' }}>{label}</p>
                          <p style={{ color: '#059669', fontSize: 12, marginTop: 4 }}>Fakturerad: {fakturerad.toFixed(2)} MSEK</p>
                          <p style={{ color: 'hsl(var(--primary))', fontSize: 12 }}>Order: {order.toFixed(2)} MSEK</p>
                          <p style={{ color: 'hsl(var(--primary) / 0.6)', fontSize: 12 }}>Budget: {budget.toFixed(2)} MSEK</p>
                          <p style={{ color: '#3b82f6', fontSize: 12 }}>Offert: {offert.toFixed(2)} MSEK</p>
                          <p style={{ fontWeight: 700, fontSize: 12, marginTop: 4, borderTop: '1px solid hsl(var(--border))', paddingTop: 4, color: 'hsl(var(--foreground))' }}>Totalt: {total.toFixed(2)} MSEK</p>
                        </div>
                      );
                    }}
                    cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                  />
                  <Legend formatter={(value: string) => {
                    const labels: Record<string, string> = { fakturerad: 'Fakturerad', order: 'Order', budget: 'Budget', offert: 'Offert (sannolikhet 4–5)' };
                    return labels[value] || value;
                  }} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="fakturerad" stackId="a" name="fakturerad" fill="#059669" />
                  <Bar dataKey="order" stackId="a" name="order" fill="hsl(var(--primary))" />
                  <Bar dataKey="budget" stackId="a" name="budget" fill="hsl(var(--primary) / 0.35)" />
                  <Bar dataKey="offert" stackId="a" name="offert" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border/50 bg-card/90 h-full flex flex-col overflow-hidden">
          <CardHeader className="pb-1">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Måluppfyllnad
            </CardTitle>
            <CardDescription className="text-xs">Order & Fakturerad vs mål {periodLabel}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center py-4">
            {salesTarget > 0 ? (
              <div className="flex flex-col items-center gap-4 w-full">
                <div className="relative w-36 h-36">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                    <motion.circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke="hsl(var(--primary))" strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - pct / 100) }}
                      transition={{ duration: 1.4, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-primary">
                      <AnimatedNumber value={Math.round(pct)} duration={1400} />%
                    </span>
                  </div>
                </div>
                <div className="text-center space-y-0.5">
                  <p className="text-sm font-semibold">{takenTotal.toFixed(1)} / {salesTarget.toFixed(1)} MSEK</p>
                  <p className="text-xs text-muted-foreground">
                    {pct >= 100 ? <span className="text-status-completed font-medium">Mål uppnått! 🎉</span> : <>Kvar: {(salesTarget - takenTotal).toFixed(1)} MSEK</>}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Inget mål satt</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
