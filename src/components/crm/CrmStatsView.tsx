import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCrmData } from '@/hooks/useCrmData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, Line, ComposedChart,
} from 'recharts';
import { format, parseISO, subMonths, startOfMonth } from 'date-fns';
import { formatSEK, SALESPEOPLE } from '@/lib/crmConstants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, TrendingUp, Percent, Trophy } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))',
];

const tooltipStyle = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 10,
  boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
  fontSize: 12,
};

export function CrmStatsView() {
  const { quotes } = useCrmData();
  const { canSeeAllSalespeople, linkedSalesperson } = usePermissions();
  const defaultFrom = format(subMonths(startOfMonth(new Date()), 11), 'yyyy-MM-dd');
  const defaultTo = format(new Date(), 'yyyy-MM-dd');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [sellerFilter, setSellerFilter] = useState<string>('all');

  // Enforce own-data-only for users without manager privileges
  useEffect(() => {
    if (!canSeeAllSalespeople && linkedSalesperson) setSellerFilter(linkedSalesperson);
  }, [canSeeAllSalespeople, linkedSalesperson]);

  const effectiveSeller = canSeeAllSalespeople ? sellerFilter : (linkedSalesperson || '__none__');

  const filtered = useMemo(
    () => quotes.filter((q) => {
      if (q.quote_date < from || q.quote_date > to) return false;
      if (effectiveSeller === 'all') return true;
      if (effectiveSeller === '__none__') return false;
      return q.salesperson === effectiveSeller;
    }),
    [quotes, from, to, effectiveSeller]
  );

  const kpis = useMemo(() => {
    const totalValue = filtered.reduce((s, q) => s + Number(q.amount || 0), 0);
    const closed = filtered.filter((q) => q.status === 'Order' || q.status === 'Avböjd' || q.status === 'Förlorad');
    const wins = closed.filter((q) => q.status === 'Order');
    const winValue = wins.reduce((s, q) => s + Number(q.amount || 0), 0);
    const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
    return {
      count: filtered.length,
      totalValue,
      winValue,
      winRate,
      avgValue: filtered.length ? totalValue / filtered.length : 0,
    };
  }, [filtered]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { month: string; count: number; value: number; orderValue: number }>();
    filtered.forEach((q) => {
      const k = format(parseISO(q.quote_date), 'yyyy-MM');
      const cur = map.get(k) || { month: k, count: 0, value: 0, orderValue: 0 };
      cur.count += 1;
      cur.value += Number(q.amount || 0);
      if (q.status === 'Order') cur.orderValue += Number(q.amount || 0);
      map.set(k, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((x) => ({
        ...x,
        valueMSEK: +(x.value / 1_000_000).toFixed(2),
        orderMSEK: +(x.orderValue / 1_000_000).toFixed(2),
      }));
  }, [filtered]);

  const winRatePerSeller = useMemo(() => {
    const sellers = Array.from(new Set(filtered.map((q) => q.salesperson).filter(Boolean)));
    return sellers
      .map((s) => {
        const items = filtered.filter((q) => q.salesperson === s && q.status !== 'Öppen' && q.status !== 'Pausad');
        const wins = items.filter((q) => q.status === 'Order').length;
        const wr = items.length ? (wins / items.length) * 100 : 0;
        return { name: s, winRate: +wr.toFixed(1), antal: items.length, wins };
      })
      .sort((a, b) => b.winRate - a.winRate);
  }, [filtered]);

  const byProduct = useMemo(() => {
    const map = new Map<string, { product: string; count: number; value: number; wins: number; closed: number }>();
    filtered.forEach((q) => {
      const k = q.product || '—';
      const cur = map.get(k) || { product: k, count: 0, value: 0, wins: 0, closed: 0 };
      cur.count += 1;
      cur.value += Number(q.amount || 0);
      if (q.status === 'Order' || q.status === 'Avböjd' || q.status === 'Förlorad') cur.closed += 1;
      if (q.status === 'Order') cur.wins += 1;
      map.set(k, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const productShare = useMemo(() => {
    const total = byProduct.reduce((s, p) => s + p.count, 0);
    return byProduct.map((p) => ({
      name: p.product,
      value: p.count,
      pct: total ? (p.count / total) * 100 : 0,
    }));
  }, [byProduct]);

  const productValueShare = useMemo(() => {
    const total = byProduct.reduce((s, p) => s + p.value, 0);
    return byProduct.map((p) => ({
      name: p.product,
      value: +(p.value / 1_000_000).toFixed(2),
      pct: total ? (p.value / total) * 100 : 0,
    }));
  }, [byProduct]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Statistik</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} offerter i vald period</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-xs">Från</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Till</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Briefcase} label="Offerter" value={String(kpis.count)} accent="primary" />
        <KpiCard icon={TrendingUp} label="Totalt värde" value={`${(kpis.totalValue / 1_000_000).toFixed(1)} MSEK`} accent="chart-2" />
        <KpiCard icon={Trophy} label="Ordervärde" value={`${(kpis.winValue / 1_000_000).toFixed(1)} MSEK`} accent="primary" />
        <KpiCard icon={Percent} label="Win rate" value={`${kpis.winRate.toFixed(0)}%`} accent="chart-3" />
      </div>

      {/* Volume & order over time */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Offertvolym & ordervärde per månad</CardTitle>
          <CardDescription>Antal offerter (staplar) och vunnet ordervärde i MSEK (linje)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={byMonth}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="count" name="Antal offerter" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="orderMSEK" name="Ordervärde (MSEK)" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--chart-2))' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Product distribution - donut + value bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Produktmix – andel av offerter</CardTitle>
            <CardDescription>Procentuell fördelning per produktkategori</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productShare}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={115}
                    paddingAngle={2}
                    label={(d: any) => `${d.pct.toFixed(0)}%`}
                    labelLine={false}
                  >
                    {productShare.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="hsl(var(--background))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: any, n: any, p: any) => [`${v} st (${p.payload.pct.toFixed(1)}%)`, n]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Värde per produkt</CardTitle>
            <CardDescription>Totalt offererat värde per kategori (MSEK)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productValueShare} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={130} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} MSEK`, 'Värde']} cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {productValueShare.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Win rate per seller */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Win rate per säljare</CardTitle>
          <CardDescription>Andel vunna affärer av avslutade offerter</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={winRatePerSeller} margin={{ top: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} formatter={(v: any, _n, p: any) => [`${v}% (${p.payload.wins}/${p.payload.antal})`, 'Win rate']} />
                <Bar dataKey="winRate" name="Win rate %" radius={[6, 6, 0, 0]}>
                  {winRatePerSeller.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Detaljerad fördelning per produkt</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Produkt</th>
                <th className="px-4 py-3 text-right">Antal</th>
                <th className="px-4 py-3 text-right">Totalt värde</th>
                <th className="px-4 py-3 text-right">Andel värde</th>
                <th className="px-4 py-3 text-right">Win rate</th>
              </tr>
            </thead>
            <tbody>
              {byProduct.map((p, idx) => {
                const totalVal = byProduct.reduce((s, x) => s + x.value, 0);
                const share = totalVal ? (p.value / totalVal) * 100 : 0;
                return (
                  <tr key={p.product} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-sm" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      {p.product}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.count}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatSEK(p.value)} kr</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${share}%`, background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        </div>
                        <span className="text-xs tabular-nums w-10 text-right">{share.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.closed ? `${((p.wins / p.closed) * 100).toFixed(0)}%` : '—'}</td>
                  </tr>
                );
              })}
              {byProduct.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Ingen data i vald period</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function KpiCard({ icon: Icon, label, value, accent = 'primary' }: { icon: any; label: string; value: string; accent?: string }) {
  return (
    <Card className="border-border/50 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 text-${accent}`} />
        </div>
        <div className="text-3xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
