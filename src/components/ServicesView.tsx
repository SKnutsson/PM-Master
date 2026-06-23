import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Plus, Trash2, Wrench, AlertTriangle, Image as ImageIcon, Calendar as CalendarIcon, History, Bell, FileWarning, ListChecks, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

type ServiceStatus = 'Bokad' | 'Utförd' | 'Försenad';

interface ServiceContract {
  id: string;
  customer: string;
  facility_name: string;
  location: string | null;
  contract_start: string | null;
  contract_end: string | null;
  recurrence_months: number;
  recurrence_month: number;
  notes: string | null;
  active: boolean;
}

interface Service {
  id: string;
  contract_id: string | null;
  customer: string;
  facility_name: string;
  planned_date: string | null;
  completed_date: string | null;
  assigned_technician: string | null;
  status: string;
  planned_hours: number;
  actual_hours: number;
  notes: string | null;
}

interface ChecklistItem { id: string; service_id: string; label: string; checked: boolean; sort_order: number; }
interface Deviation { id: string; service_id: string; description: string; severity: string; created_task_id: string | null; }
interface Attachment { id: string; service_id: string; file_url: string; caption: string; kind: string; }

const STATUS_BADGE: Record<string, string> = {
  'Bokad': 'bg-status-not-started/15 text-status-not-started border-status-not-started/30',
  'Utförd': 'bg-status-completed/15 text-status-completed border-status-completed/30',
  'Försenad': 'bg-status-delayed/15 text-status-delayed border-status-delayed/30',
};

const STATUS_DOT: Record<string, string> = {
  'Bokad': 'bg-status-not-started',
  'Utförd': 'bg-status-completed',
  'Försenad': 'bg-status-delayed',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function effectiveStatus(s: Service): ServiceStatus {
  if (s.status === 'Utförd' || s.completed_date) return 'Utförd';
  if (s.planned_date && s.planned_date < todayISO()) return 'Försenad';
  if (s.status === 'Planerad' || !s.status) return 'Bokad';
  return s.status as ServiceStatus;
}
function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr); const t = new Date(todayISO());
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

export function ServicesView() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [openServiceId, setOpenServiceId] = useState<string | null>(null);
  const [tab, setTab] = useState('timeline');

  const loadAll = async () => {
    const [{ data: c }, { data: s }] = await Promise.all([
      supabase.from('service_contracts').select('*').order('customer'),
      supabase.from('services').select('*').order('planned_date', { ascending: true }),
    ]);
    setContracts((c || []) as ServiceContract[]);
    setServices((s || []) as Service[]);
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    const ch = supabase.channel('services-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_contracts' }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const upcoming = useMemo(() => services
    .filter(s => effectiveStatus(s) !== 'Utförd')
    .sort((a, b) => (a.planned_date || '').localeCompare(b.planned_date || '')), [services]);
  const overdue = upcoming.filter(s => effectiveStatus(s) === 'Försenad');
  const reminders = upcoming.filter(s => {
    const d = daysUntil(s.planned_date); return d !== null && d >= 0 && d <= 30;
  });

  // Expected (auto) occurrences from active contracts within next 30 days
  const expectedSoon = useMemo(() => {
    const today = todayISO();
    const horizon = new Date(); horizon.setDate(horizon.getDate() + 30);
    const horizonStr = toISODate(horizon);
    const out: { contract: ServiceContract; date: string; daysLeft: number }[] = [];
    const currentY = new Date().getFullYear();
    for (const c of contracts.filter(x => x.active)) {
      if (!c.contract_start) continue;
      // Look at current and next year occurrences
      [currentY, currentY + 1].forEach(year => {
        const stepY = Math.max(1, Math.round((c.recurrence_months || 12) / 12));
        if ((year - currentY) % stepY !== 0 && stepY > 1) return;
        const date = `${year}-${String(c.recurrence_month).padStart(2, '0')}-15`;
        if (date < c.contract_start!) return;
        if (date < today || date > horizonStr) return;
        // Skip if already a real service exists for this contract+year+month
        const month0 = c.recurrence_month - 1;
        const hasReal = services.some(s => s.contract_id === c.id && s.planned_date &&
          new Date(s.planned_date).getFullYear() === year && new Date(s.planned_date).getMonth() === month0);
        if (hasReal) return;
        out.push({ contract: c, date, daysLeft: daysUntil(date)! });
      });
    }
    return out.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [contracts, services]);

  const completedThisYear = services.filter(s => s.completed_date?.startsWith(String(new Date().getFullYear()))).length;

  const openService = services.find(s => s.id === openServiceId) || null;

  const bookExpected = async (item: { contract: ServiceContract; date: string }) => {
    const { data, error } = await supabase.from('services').insert({
      contract_id: item.contract.id,
      customer: item.contract.customer || item.contract.facility_name,
      facility_name: item.contract.facility_name,
      planned_date: item.date,
      status: 'Bokad',
    }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success('Service bokad');
    if (data) setOpenServiceId(data.id);
  };


  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" /> Servicar
          </h1>
          <p className="text-sm text-muted-foreground">Planera, boka och följ upp service på teleskopläktare.</p>
        </div>
      </div>


      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="timeline">Schema</TabsTrigger>
          <TabsTrigger value="contracts">Avtal ({contracts.length})</TabsTrigger>
          <TabsTrigger value="services">Servicar ({services.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Kommande" value={upcoming.length} icon={<CalendarIcon className="h-4 w-4 text-status-not-started" />} />
            <KpiCard label="< 1 månad kvar" value={reminders.length + expectedSoon.length} icon={<Bell className="h-4 w-4 text-status-in-progress" />} />
            <KpiCard label="Försenade" value={overdue.length} icon={<AlertTriangle className="h-4 w-4 text-status-delayed" />} />
            <KpiCard label="Utförda i år" value={completedThisYear} icon={<ListChecks className="h-4 w-4 text-status-completed" />} />
          </div>

          <Card className="border-status-in-progress/40">
            <CardHeader className="py-3 px-4 bg-status-in-progress/5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-status-in-progress" /> Snart förfallna · mindre än 1 månad kvar
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-3 space-y-3">
              {expectedSoon.length > 0 && (
                <div className="border border-dashed border-status-in-progress/40 rounded-md divide-y">
                  {expectedSoon.map(e => (
                    <div key={`${e.contract.id}-${e.date}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 rotate-45 border border-dashed border-muted-foreground/70 bg-background shrink-0" />
                        <span className="font-medium truncate">{e.contract.facility_name}</span>
                        <Badge variant="outline" className="text-[10px] py-0 h-4 shrink-0">Förväntad</Badge>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs tabular-nums text-muted-foreground">{e.date} · om {e.daysLeft} d</span>
                        <Button size="sm" variant="outline" className="h-7" onClick={() => bookExpected(e)}>Boka in</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {reminders.length > 0
                ? <ServiceTable services={reminders} onOpen={setOpenServiceId} onChange={loadAll} />
                : expectedSoon.length === 0 && <p className="text-sm text-muted-foreground">Inga servicar inom 30 dagar.</p>}
            </CardContent>
          </Card>


          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" /> Alla kommande servicar
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <ServiceTable services={upcoming.slice(0, 30)} onOpen={setOpenServiceId} onChange={loadAll} />
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="timeline" className="mt-4">
          <TimelineGantt contracts={contracts} services={services} onOpen={setOpenServiceId} />
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <ContractsPanel contracts={contracts} onChange={loadAll} services={services} />
        </TabsContent>

        <TabsContent value="services" className="mt-4">
          <AllServicesPanel services={services} contracts={contracts} onOpen={setOpenServiceId} onChange={loadAll} />
        </TabsContent>
      </Tabs>

      {openService && (
        <ServiceDetailDialog
          service={openService}
          allServices={services}
          onClose={() => setOpenServiceId(null)}
          onChange={loadAll}
          userId={user?.id}
        />
      )}
    </motion.div>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
        <span>{label}</span>{icon}
      </div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
    </Card>
  );
}

function ServiceTable({ services, onOpen, onChange }: { services: Service[]; onOpen: (id: string) => void; onChange?: () => void }) {
  if (!services.length) return <p className="text-sm text-muted-foreground py-4">Inga servicar.</p>;
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Ta bort den här servicen? Allt protokoll, avvikelser och dokumentation försvinner.')) return;
    await Promise.all([
      supabase.from('service_checklist_items').delete().eq('service_id', id),
      supabase.from('service_deviations').delete().eq('service_id', id),
      supabase.from('service_attachments').delete().eq('service_id', id),
    ]);
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Service borttagen'); onChange?.(); }
  };
  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="text-xs">Anläggning</TableHead>
            <TableHead className="text-xs">Planerat</TableHead>
            <TableHead className="text-xs">Tekniker</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs text-right">Om</TableHead>
            <TableHead className="text-xs w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map(s => {
            const st = effectiveStatus(s);
            const dl = daysUntil(s.planned_date);
            return (
              <TableRow key={s.id} className="cursor-pointer" onClick={() => onOpen(s.id)}>
                <TableCell className="font-medium">{s.facility_name || s.customer || '—'}</TableCell>
                <TableCell className="tabular-nums">{s.planned_date || '—'}</TableCell>
                <TableCell>{s.assigned_technician || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell><Badge variant="outline" className={cn('text-xs', STATUS_BADGE[st])}>{st}</Badge></TableCell>
                <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                  {dl === null ? '—' : dl < 0 ? `${Math.abs(dl)} d sen` : `om ${dl} d`}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={e => handleDelete(e, s.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-status-delayed" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/* -------------------- Timeline (År-översikt) -------------------- */

interface Occurrence {
  key: string;
  facility: string;
  contract_id: string | null;
  contract?: ServiceContract;
  date: string;
  service: Service | null;
  isExpected: boolean;
}

const STATUS_CELL: Record<string, string> = {
  'Förväntad': 'bg-background text-muted-foreground border border-dashed border-muted-foreground/60 hover:bg-muted/60',
  'Bokad': 'bg-status-not-started/20 text-status-not-started border border-status-not-started/40 hover:bg-status-not-started/30',
  'Utförd': 'bg-status-completed/20 text-status-completed border border-status-completed/40 hover:bg-status-completed/30',
  'Försenad': 'bg-status-delayed/20 text-status-delayed border border-status-delayed/40 hover:bg-status-delayed/30',
};

function shortDate(iso: string) {
  return iso.slice(0, 10);
}

function TimelineGantt({ contracts, services, onOpen }: { contracts: ServiceContract[]; services: Service[]; onOpen: (id: string) => void }) {
  const currentYear = new Date().getFullYear();
  const [bookTarget, setBookTarget] = useState<Occurrence | null>(null);

  const years = useMemo(() => {
    const set = new Set<number>();
    services.forEach(s => { const d = s.completed_date || s.planned_date; if (d) set.add(new Date(d).getFullYear()); });
    contracts.filter(c => c.active && c.contract_start).forEach(c => {
      const sy = new Date(c.contract_start!).getFullYear();
      const stepY = Math.max(1, Math.round((c.recurrence_months || 12) / 12));
      for (let y = Math.max(sy, currentYear); y <= currentYear + 2; y += stepY) set.add(y);
    });
    set.add(currentYear);
    set.add(currentYear + 1);
    return Array.from(set).sort((a, b) => a - b);
  }, [services, contracts, currentYear]);

  const facilities = useMemo(() => {
    const set = new Set<string>();
    contracts.forEach(c => set.add(c.facility_name));
    services.forEach(s => { const f = s.facility_name || s.customer || '—'; set.add(f); });
    return Array.from(set);
  }, [contracts, services]);

  const occurrencesByFacility = useMemo(() => {
    const map = new Map<string, Occurrence[]>();
    facilities.forEach(f => map.set(f, []));

    services.forEach(s => {
      const d = s.completed_date || s.planned_date;
      if (!d) return;
      const facility = s.facility_name || s.customer || '—';
      const arr = map.get(facility) || [];
      arr.push({
        key: s.id, facility, contract_id: s.contract_id,
        contract: contracts.find(c => c.id === s.contract_id),
        date: d, service: s, isExpected: false,
      });
      map.set(facility, arr);
    });

    contracts.filter(c => c.active && c.contract_start).forEach(c => {
      const startYear = new Date(c.contract_start!).getFullYear();
      const stepY = Math.max(1, Math.round((c.recurrence_months || 12) / 12));
      const month0 = (c.recurrence_month || 1) - 1;
      years.forEach(year => {
        if (year < Math.max(startYear, currentYear)) return;
        if ((year - startYear) % stepY !== 0) return;
        const date = `${year}-${String(month0 + 1).padStart(2, '0')}-15`;
        if (date < c.contract_start!) return;
        const arr = map.get(c.facility_name) || [];
        const alreadyReal = arr.some(o => o.contract_id === c.id && new Date(o.date).getFullYear() === year);
        if (alreadyReal) return;
        arr.push({
          key: `expected-${c.id}-${year}`, facility: c.facility_name,
          contract_id: c.id, contract: c, date, service: null, isExpected: true,
        });
        map.set(c.facility_name, arr);
      });
    });

    return map;
  }, [services, contracts, facilities, years, currentYear]);

  const sortedFacilities = useMemo(
    () => [...facilities].sort((a, b) => a.localeCompare(b, 'sv')),
    [facilities]
  );

  const COL_W = 130;
  const LABEL_W = 220;
  const totalGridW = LABEL_W + COL_W * years.length;

  return (
    <Card>
      <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0 gap-3 flex-wrap">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" /> Schema · översikt per år
        </CardTitle>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><span className="h-3 w-5 rounded border border-dashed border-muted-foreground/60" /> Förväntad</span>
          <span className="flex items-center gap-1"><span className="h-3 w-5 rounded bg-status-not-started/30 border border-status-not-started/50" /> Bokad</span>
          <span className="flex items-center gap-1"><span className="h-3 w-5 rounded bg-status-completed/30 border border-status-completed/50" /> Utförd</span>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <TooltipProvider delayDuration={100}>
            <div style={{ minWidth: totalGridW }}>
              <div className="flex border-y bg-muted/40 sticky top-0 z-10">
                <div style={{ width: LABEL_W }} className="px-3 py-2 text-xs font-semibold text-muted-foreground border-r bg-card sticky left-0 z-20">Anläggning</div>
                {years.map(y => (
                  <div key={y} style={{ width: COL_W }} className={cn(
                    'text-center text-xs font-bold py-2 border-r last:border-r-0 tabular-nums',
                    y === currentYear && 'bg-primary/10 text-primary',
                  )}>{y}</div>
                ))}
              </div>

              {sortedFacilities.length === 0 && (
                <div className="px-4 py-6 text-sm text-muted-foreground">Inga servicar.</div>
              )}
              {sortedFacilities.map(facility => {
                const occs = occurrencesByFacility.get(facility) || [];
                const contract = contracts.find(c => c.facility_name === facility);
                return (
                  <div key={facility} className="flex border-b hover:bg-muted/20 transition-colors">
                    <div style={{ width: LABEL_W }} className="px-2.5 py-1 border-r flex items-center gap-1.5 min-w-0 sticky left-0 bg-card z-10">
                      <span className={cn('text-xs truncate', contract?.active && 'font-semibold text-primary')}>{facility}</span>
                      {contract?.active && <Badge variant="outline" className="text-[9px] py-0 px-1 h-3.5 border-primary/40 text-primary shrink-0">Avtal</Badge>}
                    </div>
                    {years.map(y => {
                      const cellOccs = occs
                        .filter(o => new Date(o.date).getFullYear() === y)
                        .sort((a, b) => a.date.localeCompare(b.date));
                      const isCurrent = y === currentYear;
                      return (
                        <div key={y} style={{ width: COL_W }} className={cn(
                          'min-h-[28px] border-r last:border-r-0 px-1 py-0.5 flex flex-wrap items-center justify-center gap-0.5 content-center',
                          isCurrent && 'bg-primary/[0.03]',
                        )}>
                          {cellOccs.map(o => {
                            const st: string = o.isExpected ? 'Förväntad' : effectiveStatus(o.service!);
                            return (
                              <Tooltip key={o.key}>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => o.isExpected ? setBookTarget(o) : onOpen(o.service!.id)}
                                    className={cn(
                                      'px-1 py-0 rounded text-[10px] font-medium tabular-nums leading-tight transition-all hover:scale-105 cursor-pointer whitespace-nowrap',
                                      STATUS_CELL[st],
                                    )}
                                  >
                                    {shortDate(o.date)}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs">
                                    <div className="font-semibold">{facility}</div>
                                    <div>{o.date} · {st}</div>
                                    {o.service?.assigned_technician && <div className="text-muted-foreground">{o.service.assigned_technician}</div>}
                                    {o.isExpected && <div className="text-muted-foreground">Klicka för att boka in</div>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </TooltipProvider>
        </div>
      </CardContent>
      {bookTarget && (
        <BookServiceDialog
          target={bookTarget}
          onClose={() => setBookTarget(null)}
          onBooked={(id) => { setBookTarget(null); onOpen(id); }}
        />
      )}
    </Card>
  );
}

function BookServiceDialog({ target, onClose, onBooked }: { target: Occurrence; onClose: () => void; onBooked: (id: string) => void }) {
  const [date, setDate] = useState(target.date);
  const [technician, setTechnician] = useState('');
  const [hours, setHours] = useState<number | ''>('');
  const [status, setStatus] = useState<ServiceStatus>('Bokad');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const { data, error } = await supabase.from('services').insert({
      contract_id: target.contract_id,
      customer: target.contract?.customer || target.facility,
      facility_name: target.facility,
      planned_date: date,
      assigned_technician: technician || null,
      planned_hours: hours === '' ? 0 : Number(hours),
      status,
      notes: notes || null,
    }).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Service bokad');
    if (data) onBooked(data.id);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" /> Boka service
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div>
            <Label className="text-xs">Anläggning</Label>
            <div className="text-sm font-semibold mt-1">{target.facility}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Planerat datum</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as ServiceStatus)}>
                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Bokad', 'Utförd'] as ServiceStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tekniker</Label>
              <Input value={technician} onChange={e => setTechnician(e.target.value)} className="h-9 mt-1" placeholder="Namn" />
            </div>
            <div>
              <Label className="text-xs">Planerade timmar</Label>
              <Input type="number" min={0} value={hours} onChange={e => setHours(e.target.value === '' ? '' : +e.target.value)} className="h-9 mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Anteckning</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 min-h-[80px]" placeholder="Förberedelser, kontaktperson…" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={submit} disabled={saving || !date}>Boka service</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


/* -------------------- Avtal -------------------- */

function ContractsPanel({ contracts, onChange, services }: { contracts: ServiceContract[]; onChange: () => void; services: Service[] }) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const addContract = async () => {
    const { error } = await supabase.from('service_contracts').insert({
      customer: 'Ny kund', facility_name: 'Ny anläggning', recurrence_months: 12, recurrence_month: 9,
      contract_start: todayISO(),
    });
    if (error) toast.error(error.message); else { toast.success('Avtal skapat'); onChange(); }
  };

  const visible = useMemo(() => {
    const filtered = contracts.filter(c =>
      activeFilter === 'all' ? true : activeFilter === 'active' ? c.active : !c.active
    );
    return [...filtered].sort((a, b) => (a.facility_name || '').localeCompare(b.facility_name || '', 'sv'));
  }, [contracts, activeFilter]);

  const activeCount = contracts.filter(c => c.active).length;
  const inactiveCount = contracts.length - activeCount;

  return (
    <Card>
      <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0 gap-2 flex-wrap">
        <CardTitle className="text-sm font-semibold">Serviceavtal & anläggningar</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
            <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla avtal ({contracts.length})</SelectItem>
              <SelectItem value="active">Aktiva ({activeCount})</SelectItem>
              <SelectItem value="inactive">Inaktiva ({inactiveCount})</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addContract} size="sm"><Plus className="h-4 w-4 mr-1" /> Nytt avtal</Button>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="px-4 pb-3 text-xs text-muted-foreground">
          Aktiva avtal genererar automatiskt återkommande servicar i tidslinjen utifrån återkommandeintervallet.
        </div>
        <div className="border-t overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs">Anläggning</TableHead>
                <TableHead className="text-xs">Plats</TableHead>
                <TableHead className="text-xs">Startdatum *</TableHead>
                <TableHead className="text-xs">Återk. (mån)</TableHead>
                <TableHead className="text-xs">Service-mån</TableHead>
                <TableHead className="text-xs">Aktiv</TableHead>
                <TableHead className="text-xs">Notering</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(c => (
                <ContractRow key={c.id} contract={c} onChange={onChange} />
              ))}
              {visible.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">Inga avtal matchar filtret.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ContractRow({ contract, onChange }: { contract: ServiceContract; onChange: () => void }) {
  const [c, setC] = useState(contract);
  useEffect(() => setC(contract), [contract]);
  const save = async (patch: Partial<ServiceContract>) => {
    const next = { ...c, ...patch }; setC(next);
    await supabase.from('service_contracts').update(patch).eq('id', c.id);
  };
  const del = async () => {
    if (!confirm('Ta bort avtal?')) return;
    await supabase.from('service_contracts').delete().eq('id', c.id);
    onChange();
  };
  return (
    <TableRow className={cn(c.active && 'bg-primary/[0.03]')}>
      <TableCell>
        <Input value={c.facility_name} onChange={e => setC({ ...c, facility_name: e.target.value })} onBlur={() => save({ facility_name: c.facility_name, customer: c.facility_name })} className={cn('h-8', c.active && 'font-semibold text-primary')} />
      </TableCell>
      <TableCell><Input value={c.location || ''} onChange={e => setC({ ...c, location: e.target.value })} onBlur={() => save({ location: c.location })} className="h-8" /></TableCell>
      <TableCell>
        <Input
          type="date"
          value={c.contract_start || ''}
          onChange={e => setC({ ...c, contract_start: e.target.value })}
          onBlur={() => save({ contract_start: c.contract_start })}
          className={cn('h-8 w-36', !c.contract_start && 'border-destructive')}
          required
        />
      </TableCell>
      <TableCell><Input type="number" value={c.recurrence_months} onChange={e => setC({ ...c, recurrence_months: +e.target.value })} onBlur={() => save({ recurrence_months: c.recurrence_months })} className="h-8 w-20" /></TableCell>
      <TableCell>
        <Select value={String(c.recurrence_month)} onValueChange={v => save({ recurrence_month: +v })}>
          <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
      </TableCell>
      <TableCell><Checkbox checked={c.active} onCheckedChange={v => save({ active: !!v })} /></TableCell>
      <TableCell><Input value={c.notes || ''} onChange={e => setC({ ...c, notes: e.target.value })} onBlur={() => save({ notes: c.notes })} className="h-8 min-w-[200px]" /></TableCell>
      <TableCell>
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={del}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </TableCell>
    </TableRow>
  );
}


/* -------------------- Alla servicar -------------------- */

function AllServicesPanel({ services, contracts, onOpen, onChange }: { services: Service[]; contracts: ServiceContract[]; onOpen: (id: string) => void; onChange: () => void }) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = services.filter(s => {
    if (statusFilter !== 'all' && effectiveStatus(s) !== statusFilter) return false;
    if (search && !`${s.customer} ${s.facility_name} ${s.assigned_technician}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addService = async () => {
    const { error } = await supabase.from('services').insert({
      customer: '', facility_name: '', status: 'Bokad', planned_date: todayISO(),
    });
    if (error) toast.error(error.message); else onChange();
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0 gap-2">
        <CardTitle className="text-sm font-semibold">Alla servicar</CardTitle>
        <div className="flex gap-2 items-center">
          <Input placeholder="Sök kund, anläggning, tekniker…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs h-9" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla status</SelectItem>
              {(['Bokad', 'Utförd', 'Försenad'] as ServiceStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={addService}><Plus className="h-4 w-4 mr-1" /> Ny service</Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <ServiceTable services={filtered} onOpen={onOpen} onChange={onChange} />
      </CardContent>
    </Card>
  );
}

/* -------------------- Service-detalj (protokoll) -------------------- */

function ServiceDetailDialog({ service, allServices, onClose, onChange, userId }: { service: Service; allServices: Service[]; onClose: () => void; onChange: () => void; userId?: string }) {
  const [s, setS] = useState(service);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newCheck, setNewCheck] = useState('');
  const [newDev, setNewDev] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => setS(service), [service]);

  const loadChildren = async () => {
    const [c, d, a] = await Promise.all([
      supabase.from('service_checklist_items').select('*').eq('service_id', service.id).order('sort_order'),
      supabase.from('service_deviations').select('*').eq('service_id', service.id).order('created_at'),
      supabase.from('service_attachments').select('*').eq('service_id', service.id).order('created_at'),
    ]);
    setChecklist((c.data || []) as ChecklistItem[]);
    setDeviations((d.data || []) as Deviation[]);
    setAttachments((a.data || []) as Attachment[]);
  };
  useEffect(() => { loadChildren(); }, [service.id]);

  const save = async (patch: Partial<Service>) => {
    const next = { ...s, ...patch }; setS(next);
    await supabase.from('services').update(patch).eq('id', service.id);
    onChange();
  };

  const addCheck = async () => {
    if (!newCheck.trim()) return;
    const { data } = await supabase.from('service_checklist_items').insert({
      service_id: service.id, label: newCheck, sort_order: checklist.length,
    }).select().single();
    if (data) setChecklist([...checklist, data as ChecklistItem]);
    setNewCheck('');
  };
  const toggleCheck = async (item: ChecklistItem) => {
    setChecklist(checklist.map(c => c.id === item.id ? { ...c, checked: !c.checked } : c));
    await supabase.from('service_checklist_items').update({ checked: !item.checked }).eq('id', item.id);
  };
  const delCheck = async (id: string) => {
    setChecklist(checklist.filter(c => c.id !== id));
    await supabase.from('service_checklist_items').delete().eq('id', id);
  };

  const addDev = async () => {
    if (!newDev.trim()) return;
    const { data } = await supabase.from('service_deviations').insert({
      service_id: service.id, description: newDev, severity: 'Medel',
    }).select().single();
    if (data) setDeviations([...deviations, data as Deviation]);
    setNewDev('');
  };
  const delDev = async (id: string) => {
    setDeviations(deviations.filter(d => d.id !== id));
    await supabase.from('service_deviations').delete().eq('id', id);
  };
  const createTaskFromDev = async (dev: Deviation) => {
    const { data, error } = await supabase.from('tasks').insert({
      name: `Åtgärd: ${dev.description}`, responsible: s.assigned_technician || '', status: 'Ej påbörjad',
      comment: `Avvikelse från service ${s.customer} – ${s.facility_name}`,
      created_by: userId,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    await supabase.from('service_deviations').update({ created_task_id: data.id }).eq('id', dev.id);
    setDeviations(deviations.map(d => d.id === dev.id ? { ...d, created_task_id: data.id } : d));
    toast.success('Åtgärd skapad i Uppgifter');
  };

  const onUpload = async (file: File) => {
    setUploading(true);
    const path = `${service.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('service-attachments').upload(path, file);
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: pub } = supabase.storage.from('service-attachments').getPublicUrl(path);
    const { data } = await supabase.from('service_attachments').insert({
      service_id: service.id, file_url: pub.publicUrl, kind: 'image', caption: '',
    }).select().single();
    if (data) setAttachments([...attachments, data as Attachment]);
    setUploading(false);
  };
  const delAttachment = async (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
    await supabase.from('service_attachments').delete().eq('id', id);
  };

  const history = allServices.filter(x =>
    x.id !== service.id && x.facility_name === s.facility_name
  ).sort((a, b) => (b.planned_date || '').localeCompare(a.planned_date || ''));

  const st = effectiveStatus(s);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 pr-8">
            <span className="flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" />{s.facility_name || 'Service'}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={STATUS_BADGE[st]}>{st}</Badge>
              <Button size="sm" variant="ghost" className="h-8 text-status-delayed hover:text-status-delayed hover:bg-status-delayed/10"
                onClick={async () => {
                  if (!confirm('Ta bort den här servicen? Allt protokoll, avvikelser och dokumentation försvinner.')) return;
                  await Promise.all([
                    supabase.from('service_checklist_items').delete().eq('service_id', service.id),
                    supabase.from('service_deviations').delete().eq('service_id', service.id),
                    supabase.from('service_attachments').delete().eq('service_id', service.id),
                  ]);
                  const { error } = await supabase.from('services').delete().eq('id', service.id);
                  if (error) { toast.error(error.message); return; }
                  toast.success('Service borttagen');
                  onChange();
                  onClose();
                }}>
                <Trash2 className="h-4 w-4 mr-1" /> Ta bort
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            <Card className="p-3 grid grid-cols-2 gap-3">
              <div><Label>Kund</Label><Input value={s.customer} onChange={e => setS({ ...s, customer: e.target.value })} onBlur={() => save({ customer: s.customer })} /></div>
              <div><Label>Anläggning</Label><Input value={s.facility_name} onChange={e => setS({ ...s, facility_name: e.target.value })} onBlur={() => save({ facility_name: s.facility_name })} /></div>
              <div><Label>Planerat datum</Label><Input type="date" value={s.planned_date || ''} onChange={e => save({ planned_date: e.target.value })} /></div>
              <div><Label>Utfört datum</Label><Input type="date" value={s.completed_date || ''} onChange={e => save({ completed_date: e.target.value || null })} /></div>
              <div><Label>Tekniker</Label><Input value={s.assigned_technician || ''} onChange={e => setS({ ...s, assigned_technician: e.target.value })} onBlur={() => save({ assigned_technician: s.assigned_technician })} /></div>
              <div><Label>Status</Label>
                <Select value={s.status} onValueChange={v => save({ status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(['Bokad', 'Utförd', 'Försenad'] as ServiceStatus[]).map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Planerad tid (h)</Label><Input type="number" step="0.5" value={s.planned_hours} onChange={e => setS({ ...s, planned_hours: +e.target.value })} onBlur={() => save({ planned_hours: s.planned_hours })} /></div>
              <div><Label>Faktisk tid (h)</Label><Input type="number" step="0.5" value={s.actual_hours} onChange={e => setS({ ...s, actual_hours: +e.target.value })} onBlur={() => save({ actual_hours: s.actual_hours })} /></div>
            </Card>

            <Card className="p-3">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><ListChecks className="h-4 w-4" /> Checklista (protokoll)</h4>
              <div className="space-y-1 mb-2">
                {checklist.map(c => (
                  <div key={c.id} className="flex items-center gap-2">
                    <Checkbox checked={c.checked} onCheckedChange={() => toggleCheck(c)} />
                    <span className={`flex-1 text-sm ${c.checked ? 'line-through text-muted-foreground' : ''}`}>{c.label}</span>
                    <Button size="sm" variant="ghost" onClick={() => delCheck(c.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Ny kontrollpunkt…" value={newCheck} onChange={e => setNewCheck(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCheck()} className="h-8" />
                <Button size="sm" onClick={addCheck}><Plus className="h-4 w-4" /></Button>
              </div>
            </Card>

            <Card className="p-3">
              <Label>Anteckningar</Label>
              <Textarea value={s.notes || ''} onChange={e => setS({ ...s, notes: e.target.value })} onBlur={() => save({ notes: s.notes })} rows={3} />
            </Card>

            <Card className="p-3">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileWarning className="h-4 w-4 text-status-in-progress" /> Avvikelser / fel</h4>
              <div className="space-y-2 mb-2">
                {deviations.map(d => (
                  <div key={d.id} className="flex items-center gap-2 text-sm border rounded p-2">
                    <span className="flex-1">{d.description}</span>
                    {d.created_task_id ? (
                      <Badge variant="outline" className="text-xs">Åtgärd skapad</Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => createTaskFromDev(d)}>Skapa åtgärd</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => delDev(d.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Beskriv avvikelse…" value={newDev} onChange={e => setNewDev(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDev()} className="h-8" />
                <Button size="sm" onClick={addDev}><Plus className="h-4 w-4" /></Button>
              </div>
            </Card>

            <Card className="p-3">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Dokumentation</h4>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {attachments.map(a => (
                  <div key={a.id} className="relative group border rounded overflow-hidden">
                    {a.kind === 'image' && a.file_url ? (
                      <img src={a.file_url} alt={a.caption} className="w-full h-24 object-cover" />
                    ) : (
                      <div className="h-24 flex items-center justify-center text-xs">{a.caption || 'Anteckning'}</div>
                    )}
                    <Button size="sm" variant="destructive" className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => delAttachment(a.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
              <Input type="file" accept="image/*" disabled={uploading} onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
            </Card>
          </div>

          <div className="space-y-3">
            <Card className="p-3">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><History className="h-4 w-4" /> Servicehistorik</h4>
              {history.length === 0 ? <p className="text-xs text-muted-foreground">Ingen tidigare service.</p> : (
                <div className="space-y-2">
                  {history.map(h => (
                    <div key={h.id} className="text-xs border-l-2 border-primary/40 pl-2">
                      <div className="font-medium tabular-nums">{h.completed_date || h.planned_date}</div>
                      <div className="text-muted-foreground">{h.assigned_technician || '—'}</div>
                      <Badge variant="outline" className={cn('text-[10px]', STATUS_BADGE[effectiveStatus(h)])}>{effectiveStatus(h)}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-3 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Planerad tid</span><span>{s.planned_hours} h</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Faktisk tid</span><span>{s.actual_hours} h</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Diff</span><span className={s.actual_hours > s.planned_hours ? 'text-status-delayed' : 'text-status-completed'}>{(s.actual_hours - s.planned_hours).toFixed(1)} h</span></div>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
