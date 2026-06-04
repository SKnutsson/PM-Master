import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCrmData } from '@/hooks/useCrmData';
import { formatMSEK, formatSEK, SALESPEOPLE } from '@/lib/crmConstants';
import { TrendingUp, Briefcase, CheckCircle2, Percent, Flame, Users, Clock, ArrowUpRight } from 'lucide-react';
import { format, startOfMonth, subMonths } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { SalesOverviewPanel } from '../SalesOverviewPanel';
import { usePermissions } from '@/hooks/usePermissions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
};

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

// Hero card matching Projektledning Dashboard style
function HeroCard({
  label, value, suffix, icon: Icon, gradient,
}: { label: string; value: number | string; suffix?: string; icon: any; gradient: string }) {
  return (
    <motion.div variants={itemVariants}>
      <div className={`relative overflow-hidden rounded-xl ${gradient} p-6 shadow-md transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg h-full`}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 translate-y-8 -translate-x-8" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/60 uppercase tracking-wider">{label}</p>
            <p className="text-5xl font-bold text-white mt-1">
              {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
              {suffix && <span className="text-lg font-normal text-white/50 ml-1.5">{suffix}</span>}
            </p>
          </div>
          <div className="rounded-xl p-3 bg-white/10 backdrop-blur-sm">
            <Icon className="h-7 w-7 text-white/80" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Probability bucket color per level (1-5)
const probColors: Record<number, { bg: string; ring: string; label: string }> = {
  1: { bg: 'from-[hsl(0_45%_45%)] to-[hsl(0_40%_35%)]', ring: 'bg-white/15', label: 'Mycket låg' },
  2: { bg: 'from-[hsl(25_75%_50%)] to-[hsl(25_70%_40%)]', ring: 'bg-white/15', label: 'Låg' },
  3: { bg: 'from-[hsl(180_45%_40%)] to-[hsl(180_50%_30%)]', ring: 'bg-white/15', label: 'Medel' },
  4: { bg: 'from-[hsl(160_55%_36%)] to-[hsl(160_50%_24%)]', ring: 'bg-white/15', label: 'Hög' },
  5: { bg: 'from-[hsl(142_71%_38%)] to-[hsl(145_70%_28%)]', ring: 'bg-white/15', label: 'Mycket hög' },
};

export function CrmDashboard() {
  const { quotes: allQuotes } = useCrmData();
  const { canSeeAllSalespeople, linkedSalesperson } = usePermissions();
  const [sellerFilter, setSellerFilter] = useState<string>('all');

  useEffect(() => {
    if (!canSeeAllSalespeople && linkedSalesperson) setSellerFilter(linkedSalesperson);
  }, [canSeeAllSalespeople, linkedSalesperson]);

  const effectiveSeller = canSeeAllSalespeople ? sellerFilter : (linkedSalesperson || '__none__');

  const quotes = useMemo(() => {
    if (effectiveSeller === 'all') return allQuotes;
    if (effectiveSeller === '__none__') return [];
    return allQuotes.filter((q) => q.salesperson === effectiveSeller);
  }, [allQuotes, effectiveSeller]);

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

    const probBuckets = [5, 4, 3, 2, 1].map((n) => {
      const items = open.filter((q) => q.probability === n);
      return { n, count: items.length, value: items.reduce((s, q) => s + Number(q.amount || 0), 0) };
    });

    const perSeller = Array.from(new Set(open.map((q) => q.salesperson).filter(Boolean))).map((p) => {
      const items = open.filter((q) => q.salesperson === p);
      return { name: p, count: items.length, value: items.reduce((s, q) => s + Number(q.amount || 0), 0) };
    }).sort((a, b) => b.value - a.value);

    const maxSellerValue = Math.max(1, ...perSeller.map((s) => s.value));

    return { open, pipelineValue, ordersThisMonth, winRate, followups, probBuckets, perSeller, maxSellerValue };
  }, [quotes]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5 p-6"
    >
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM Dashboard</h1>
          <p className="text-sm text-muted-foreground">Översikt över offertstock och uppföljningar</p>
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          {canSeeAllSalespeople ? (
            <div>
              <Label className="text-xs">Säljare</Label>
              <Select value={sellerFilter} onValueChange={setSellerFilter}>
                <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla säljare</SelectItem>
                  {SALESPEOPLE.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : linkedSalesperson ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
              Visar endast: <span className="font-semibold">{linkedSalesperson}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── ROW 1: Hero KPI cards (matching Projektledning) ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <HeroCard
          label="Aktiva offerter"
          value={stats.open.length}
          icon={Briefcase}
          gradient="bg-gradient-to-br from-[hsl(168_30%_16%)] to-[hsl(168_40%_10%)]"
        />
        <HeroCard
          label="Offertstock"
          value={formatMSEK(stats.pipelineValue)}
          suffix="MSEK"
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-[hsl(160_55%_36%)] to-[hsl(160_50%_24%)]"
        />
        <HeroCard
          label="Order denna månad"
          value={stats.ordersThisMonth}
          icon={CheckCircle2}
          gradient="bg-gradient-to-br from-[hsl(142_71%_38%)] to-[hsl(145_70%_28%)]"
        />
        <HeroCard
          label="Win rate 12 mån"
          value={`${stats.winRate.toFixed(0)}%`}
          icon={Percent}
          gradient="bg-gradient-to-br from-[hsl(180_50%_38%)] to-[hsl(180_55%_24%)]"
        />
      </div>

      {/* Sales overview */}
      <motion.div variants={itemVariants}>
        <SalesOverviewPanel salesPersonFilter={canSeeAllSalespeople ? (sellerFilter === 'all' ? null : sellerFilter) : linkedSalesperson} />
      </motion.div>

      {/* ── ROW 3: Probability buckets — Phase-card style ── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-3">
          <Flame className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sannolikhetsöversikt</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stats.probBuckets.map((b, idx) => {
            const c = probColors[b.n];
            const share = stats.pipelineValue > 0 ? (b.value / stats.pipelineValue) * 100 : 0;
            return (
              <motion.div
                key={b.n}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05, type: 'spring' as const, stiffness: 300, damping: 26 }}
                className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${c.bg} p-5 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg group`}
              >
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/5 -translate-y-8 translate-x-8" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-white/60 uppercase tracking-wider">{c.label}</span>
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${c.ring} backdrop-blur-sm text-white text-sm font-bold`}>
                      {b.n}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-white tabular-nums">
                    <AnimatedNumber value={b.count} />
                  </div>
                  <div className="text-xs text-white/60">offerter</div>
                  <div className="mt-3 text-sm font-semibold text-white tabular-nums">{formatSEK(b.value)} kr</div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                    <motion.div
                      className="h-full bg-white/70 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${share}%` }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── ROW 4: Followups + Per seller side by side ── */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 bg-card/90 h-full flex flex-col overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" />
                Offerter att följa upp
              </CardTitle>
              <CardDescription className="text-xs">Försenade uppföljningar sorterade efter datum</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
              {stats.followups.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground italic">Inga försenade uppföljningar 🎉</p>
              ) : (
                <div className="divide-y divide-border/30">
                  <AnimatePresence>
                    {stats.followups.slice(0, 12).map((q, idx) => (
                      <motion.div
                        key={q.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors cursor-default group"
                      >
                        <div className="rounded-full p-2 bg-destructive/10 text-destructive shrink-0">
                          <Clock className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{q.customer_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{q.product} · {q.salesperson}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold tabular-nums">{formatSEK(q.amount)} kr</p>
                          <Badge variant="outline" className="text-[10px] mt-0.5 text-destructive border-destructive/40 bg-destructive/10">
                            {q.next_followup}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {canSeeAllSalespeople && (
          <motion.div variants={itemVariants}>
            <Card className="border-border/50 bg-card/90 h-full flex flex-col overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" />
                  Per säljare
                </CardTitle>
                <CardDescription className="text-xs">Aktiv offertstock per person</CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto">
                {stats.perSeller.length === 0 ? (
                  <p className="px-6 py-8 text-center text-sm text-muted-foreground italic">Ingen data ännu</p>
                ) : (
                  <div className="divide-y divide-border/30">
                    {stats.perSeller.map((s, idx) => {
                      const pct = (s.value / stats.maxSellerValue) * 100;
                      return (
                        <motion.div
                          key={s.name}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.04 }}
                          className="px-5 py-3 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-semibold">{s.name}</span>
                            <div className="flex items-center gap-3 text-sm tabular-nums">
                              <span className="text-muted-foreground">{s.count} st</span>
                              <span className="font-semibold">{formatSEK(s.value)} kr</span>
                            </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-primary to-[hsl(160_55%_50%)] rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
