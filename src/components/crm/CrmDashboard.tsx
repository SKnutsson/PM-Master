import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCrmData } from '@/hooks/useCrmData';
import { formatMSEK, formatSEK, statusBadgeClass } from '@/lib/crmConstants';
import { TrendingUp, Briefcase, CheckCircle2, Percent } from 'lucide-react';
import { format, startOfMonth, subMonths } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function CrmDashboard() {
  const { quotes } = useCrmData();

  const stats = useMemo(() => {
    const open = quotes.filter((q) => q.status === 'Öppen');
    const pipelineValue = open.reduce((s, q) => s + Number(q.amount || 0), 0);
    const monthStart = startOfMonth(new Date());
    const ordersThisMonth = quotes.filter((q) => q.status === 'Order' && new Date(q.updated_at) >= monthStart).length;
    const last12 = subMonths(new Date(), 12);
    const recent = quotes.filter((q) => new Date(q.quote_date) >= last12 && q.status !== 'Öppen' && q.status !== 'Pausad');
    const wins = recent.filter((q) => q.status === 'Order').length;
    const winRate = recent.length ? (wins / recent.length) * 100 : 0;

    const today = format(new Date(), 'yyyy-MM-dd');
    const followups = open
      .filter((q) => q.next_followup && q.next_followup <= today)
      .sort((a, b) => (a.next_followup! < b.next_followup! ? -1 : 1));

    const probBuckets = [1, 2, 3, 4, 5].map((n) => {
      const items = open.filter((q) => q.probability === n);
      return { n, count: items.length, value: items.reduce((s, q) => s + Number(q.amount || 0), 0) };
    });

    const perSeller = Array.from(new Set(open.map((q) => q.salesperson).filter(Boolean))).map((p) => {
      const items = open.filter((q) => q.salesperson === p);
      return { name: p, count: items.length, value: items.reduce((s, q) => s + Number(q.amount || 0), 0) };
    }).sort((a, b) => b.value - a.value);

    return { open, pipelineValue, ordersThisMonth, winRate, followups, probBuckets, perSeller };
  }, [quotes]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CRM Dashboard</h1>
        <p className="text-sm text-muted-foreground">Översikt över pipeline och uppföljningar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard icon={Briefcase} label="Aktiva offerter" value={String(stats.open.length)} />
        <KpiCard icon={TrendingUp} label="Pipeline (MSEK)" value={formatMSEK(stats.pipelineValue)} />
        <KpiCard icon={CheckCircle2} label="Order denna månad" value={String(stats.ordersThisMonth)} />
        <KpiCard icon={Percent} label="Win rate (12 mån)" value={`${stats.winRate.toFixed(0)}%`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Offerter att följa upp</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stats.followups.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">Inga försenade uppföljningar 🎉</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Kund</th>
                  <th className="px-4 py-2 text-left">Produkt</th>
                  <th className="px-4 py-2 text-right">Belopp</th>
                  <th className="px-4 py-2 text-left">Säljare</th>
                  <th className="px-4 py-2 text-left">Uppföljning</th>
                </tr>
              </thead>
              <tbody>
                {stats.followups.map((q) => (
                  <tr key={q.id} className="border-t border-border hover:bg-muted/40 cursor-pointer">
                    <td className="px-4 py-2 font-medium">{q.customer_name}</td>
                    <td className="px-4 py-2">{q.product}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatSEK(q.amount)}</td>
                    <td className="px-4 py-2">{q.salesperson}</td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className="text-destructive border-destructive/40 bg-destructive/10">{q.next_followup}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sannolikhetsöversikt</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats.probBuckets.map((b) => (
            <Card key={b.n} className="bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground">Nivå</div>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">{b.n}</span>
                </div>
                <div className="text-2xl font-bold tabular-nums">{b.count}</div>
                <div className="text-xs text-muted-foreground">offerter</div>
                <div className="mt-2 text-sm font-medium tabular-nums">{formatSEK(b.value)} kr</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Per säljare</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Säljare</th>
                <th className="px-4 py-2 text-right">Aktiva offerter</th>
                <th className="px-4 py-2 text-right">Pipeline-värde</th>
              </tr>
            </thead>
            <tbody>
              {stats.perSeller.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">Ingen data ännu</td></tr>
              ) : stats.perSeller.map((s) => (
                <tr key={s.name} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2 text-right">{s.count}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatSEK(s.value)} kr</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="text-3xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
