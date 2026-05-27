import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCrmData } from '@/hooks/useCrmData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO, subMonths, startOfMonth } from 'date-fns';
import { formatSEK, formatMSEK } from '@/lib/crmConstants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CrmStatsView() {
  const { quotes } = useCrmData();
  const defaultFrom = format(subMonths(startOfMonth(new Date()), 11), 'yyyy-MM-dd');
  const defaultTo = format(new Date(), 'yyyy-MM-dd');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const filtered = useMemo(() => quotes.filter((q) => q.quote_date >= from && q.quote_date <= to), [quotes, from, to]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { month: string; count: number; value: number }>();
    filtered.forEach((q) => {
      const k = format(parseISO(q.quote_date), 'yyyy-MM');
      const cur = map.get(k) || { month: k, count: 0, value: 0 };
      cur.count += 1;
      cur.value += Number(q.amount || 0);
      map.set(k, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month)).map((x) => ({ ...x, valueMSEK: +(x.value / 1_000_000).toFixed(2) }));
  }, [filtered]);

  const winRatePerSeller = useMemo(() => {
    const sellers = Array.from(new Set(filtered.map((q) => q.salesperson).filter(Boolean)));
    return sellers.map((s) => {
      const items = filtered.filter((q) => q.salesperson === s && q.status !== 'Öppen' && q.status !== 'Pausad');
      const wins = items.filter((q) => q.status === 'Order').length;
      const wr = items.length ? (wins / items.length) * 100 : 0;
      return { name: s, winRate: +wr.toFixed(1), antal: items.length };
    });
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Statistik</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} offerter i vald period</p>
        </div>
        <div className="flex items-end gap-2">
          <div><Label className="text-xs">Från</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label className="text-xs">Till</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Offertvolym per månad</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Legend />
                <Bar yAxisId="left" dataKey="count" name="Antal" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="valueMSEK" name="Värde (MSEK)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Win rate per säljare</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={winRatePerSeller}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Bar dataKey="winRate" name="Win rate %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Fördelning per produkt</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Produkt</th>
                <th className="px-4 py-2 text-right">Antal</th>
                <th className="px-4 py-2 text-right">Totalt värde</th>
                <th className="px-4 py-2 text-right">Win rate</th>
              </tr>
            </thead>
            <tbody>
              {byProduct.map((p) => (
                <tr key={p.product} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{p.product}</td>
                  <td className="px-4 py-2 text-right">{p.count}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatSEK(p.value)} kr</td>
                  <td className="px-4 py-2 text-right">{p.closed ? `${((p.wins / p.closed) * 100).toFixed(0)}%` : '—'}</td>
                </tr>
              ))}
              {byProduct.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Ingen data i vald period</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
