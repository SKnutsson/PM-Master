import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Wrench, AlertTriangle, Image as ImageIcon, Calendar, Clock, History, Bell, FileWarning, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

type ServiceStatus = 'Planerad' | 'Bokad' | 'Utförd' | 'Försenad';

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

const STATUS_COLORS: Record<string, string> = {
  'Planerad': 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'Bokad': 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  'Utförd': 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30',
  'Försenad': 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function effectiveStatus(s: Service): ServiceStatus {
  if (s.status === 'Utförd' || s.completed_date) return 'Utförd';
  if (s.planned_date && s.planned_date < todayISO()) return 'Försenad';
  return (s.status as ServiceStatus) || 'Planerad';
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
  const [tab, setTab] = useState('overview');

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
  const completedThisYear = services.filter(s => s.completed_date?.startsWith(String(new Date().getFullYear()))).length;

  const openService = services.find(s => s.id === openServiceId) || null;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6 text-primary" /> Servicar</h1>
          <p className="text-sm text-muted-foreground">Planera och följ upp service på teleskopläktare</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="contracts">Serviceavtal ({contracts.length})</TabsTrigger>
          <TabsTrigger value="services">Alla servicar ({services.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Kommande" value={upcoming.length} icon={<Calendar className="h-4 w-4" />} />
            <KpiCard label="Påminnelser ≤30 d" value={reminders.length} icon={<Bell className="h-4 w-4" />} />
            <KpiCard label="Försenade" value={overdue.length} icon={<AlertTriangle className="h-4 w-4 text-red-500" />} />
            <KpiCard label="Utförda i år" value={completedThisYear} icon={<ListChecks className="h-4 w-4 text-green-600" />} />
          </div>

          <Card className="p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Bell className="h-4 w-4" /> Påminnelser & kommande</h3>
            <ServiceTable services={upcoming.slice(0, 25)} onOpen={setOpenServiceId} />
          </Card>
        </TabsContent>

        <TabsContent value="contracts">
          <ContractsPanel contracts={contracts} onChange={loadAll} services={services} />
        </TabsContent>

        <TabsContent value="services">
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
    </div>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-muted-foreground text-xs">{label} {icon}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
}

function ServiceTable({ services, onOpen }: { services: Service[]; onOpen: (id: string) => void }) {
  if (!services.length) return <p className="text-sm text-muted-foreground">Inga servicar.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Kund</TableHead>
          <TableHead>Anläggning</TableHead>
          <TableHead>Planerat</TableHead>
          <TableHead>Tekniker</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map(s => {
          const st = effectiveStatus(s);
          return (
            <TableRow key={s.id} className="cursor-pointer" onClick={() => onOpen(s.id)}>
              <TableCell className="font-medium">{s.customer || '—'}</TableCell>
              <TableCell>{s.facility_name || '—'}</TableCell>
              <TableCell>{s.planned_date || '—'}</TableCell>
              <TableCell>{s.assigned_technician || '—'}</TableCell>
              <TableCell><Badge variant="outline" className={STATUS_COLORS[st]}>{st}</Badge></TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ContractsPanel({ contracts, onChange, services }: { contracts: ServiceContract[]; onChange: () => void; services: Service[] }) {
  const addContract = async () => {
    const { error } = await supabase.from('service_contracts').insert({
      customer: 'Ny kund', facility_name: 'Ny anläggning', recurrence_months: 12, recurrence_month: 9,
    });
    if (error) toast.error(error.message); else { toast.success('Avtal skapat'); onChange(); }
  };

  const generateNext = async (c: ServiceContract) => {
    const last = services.filter(s => s.contract_id === c.id).sort((a, b) => (b.planned_date || '').localeCompare(a.planned_date || ''))[0];
    const baseYear = last?.planned_date ? new Date(last.planned_date).getFullYear() : new Date().getFullYear();
    const nextYear = baseYear + Math.max(1, Math.round(c.recurrence_months / 12));
    const planned = `${nextYear}-${String(c.recurrence_month).padStart(2, '0')}-15`;
    const { error } = await supabase.from('services').insert({
      contract_id: c.id, customer: c.customer, facility_name: c.facility_name,
      planned_date: planned, status: 'Planerad',
    });
    if (error) toast.error(error.message); else { toast.success('Service genererad'); onChange(); }
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">Serviceavtal</h3>
        <Button onClick={addContract} size="sm"><Plus className="h-4 w-4 mr-1" /> Nytt avtal</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kund</TableHead>
            <TableHead>Anläggning</TableHead>
            <TableHead>Plats</TableHead>
            <TableHead>Återkommer (mån)</TableHead>
            <TableHead>Service-månad</TableHead>
            <TableHead>Aktiv</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map(c => (
            <ContractRow key={c.id} contract={c} onChange={onChange} onGenerate={() => generateNext(c)} />
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function ContractRow({ contract, onChange, onGenerate }: { contract: ServiceContract; onChange: () => void; onGenerate: () => void }) {
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
    <TableRow>
      <TableCell><Input value={c.customer} onChange={e => setC({ ...c, customer: e.target.value })} onBlur={() => save({ customer: c.customer })} className="h-8" /></TableCell>
      <TableCell><Input value={c.facility_name} onChange={e => setC({ ...c, facility_name: e.target.value })} onBlur={() => save({ facility_name: c.facility_name })} className="h-8" /></TableCell>
      <TableCell><Input value={c.location || ''} onChange={e => setC({ ...c, location: e.target.value })} onBlur={() => save({ location: c.location })} className="h-8" /></TableCell>
      <TableCell><Input type="number" value={c.recurrence_months} onChange={e => setC({ ...c, recurrence_months: +e.target.value })} onBlur={() => save({ recurrence_months: c.recurrence_months })} className="h-8 w-20" /></TableCell>
      <TableCell>
        <Select value={String(c.recurrence_month)} onValueChange={v => save({ recurrence_month: +v })}>
          <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
      </TableCell>
      <TableCell><Checkbox checked={c.active} onCheckedChange={v => save({ active: !!v })} /></TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={onGenerate}>Generera nästa</Button>
          <Button size="sm" variant="ghost" onClick={del}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

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
      customer: '', facility_name: '', status: 'Planerad', planned_date: todayISO(),
    });
    if (error) toast.error(error.message); else onChange();
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex gap-2 items-center">
        <Input placeholder="Sök kund, anläggning, tekniker…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm h-9" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla status</SelectItem>
            {(['Planerad', 'Bokad', 'Utförd', 'Försenad'] as ServiceStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" onClick={addService}><Plus className="h-4 w-4 mr-1" /> Ny service</Button>
      </div>
      <ServiceTable services={filtered} onOpen={onOpen} />
    </Card>
  );
}

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
    x.id !== service.id && x.customer === s.customer && x.facility_name === s.facility_name
  ).sort((a, b) => (b.planned_date || '').localeCompare(a.planned_date || ''));

  const st = effectiveStatus(s);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{s.customer || 'Service'} — {s.facility_name || '—'}</span>
            <Badge variant="outline" className={STATUS_COLORS[st]}>{st}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            {/* Grunddata */}
            <Card className="p-3 grid grid-cols-2 gap-3">
              <div><Label>Kund</Label><Input value={s.customer} onChange={e => setS({ ...s, customer: e.target.value })} onBlur={() => save({ customer: s.customer })} /></div>
              <div><Label>Anläggning</Label><Input value={s.facility_name} onChange={e => setS({ ...s, facility_name: e.target.value })} onBlur={() => save({ facility_name: s.facility_name })} /></div>
              <div><Label>Planerat datum</Label><Input type="date" value={s.planned_date || ''} onChange={e => save({ planned_date: e.target.value })} /></div>
              <div><Label>Utfört datum</Label><Input type="date" value={s.completed_date || ''} onChange={e => save({ completed_date: e.target.value || null })} /></div>
              <div><Label>Tekniker</Label><Input value={s.assigned_technician || ''} onChange={e => setS({ ...s, assigned_technician: e.target.value })} onBlur={() => save({ assigned_technician: s.assigned_technician })} /></div>
              <div><Label>Status</Label>
                <Select value={s.status} onValueChange={v => save({ status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(['Planerad', 'Bokad', 'Utförd', 'Försenad'] as ServiceStatus[]).map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Planerad tid (h)</Label><Input type="number" step="0.5" value={s.planned_hours} onChange={e => setS({ ...s, planned_hours: +e.target.value })} onBlur={() => save({ planned_hours: s.planned_hours })} /></div>
              <div><Label>Faktisk tid (h)</Label><Input type="number" step="0.5" value={s.actual_hours} onChange={e => setS({ ...s, actual_hours: +e.target.value })} onBlur={() => save({ actual_hours: s.actual_hours })} /></div>
            </Card>

            {/* Checklista */}
            <Card className="p-3">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><ListChecks className="h-4 w-4" /> Checklista</h4>
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

            {/* Anteckningar */}
            <Card className="p-3">
              <Label>Anteckningar</Label>
              <Textarea value={s.notes || ''} onChange={e => setS({ ...s, notes: e.target.value })} onBlur={() => save({ notes: s.notes })} rows={3} />
            </Card>

            {/* Avvikelser */}
            <Card className="p-3">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileWarning className="h-4 w-4 text-orange-500" /> Avvikelser / fel</h4>
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

            {/* Dokumentation */}
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

          {/* Historik */}
          <div className="space-y-3">
            <Card className="p-3">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><History className="h-4 w-4" /> Servicehistorik</h4>
              {history.length === 0 ? <p className="text-xs text-muted-foreground">Ingen tidigare service.</p> : (
                <div className="space-y-2">
                  {history.map(h => (
                    <div key={h.id} className="text-xs border-l-2 border-primary/30 pl-2">
                      <div className="font-medium">{h.completed_date || h.planned_date}</div>
                      <div className="text-muted-foreground">{h.assigned_technician || '—'}</div>
                      <Badge variant="outline" className={`${STATUS_COLORS[effectiveStatus(h)]} text-[10px]`}>{effectiveStatus(h)}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-3 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Planerad tid</span><span>{s.planned_hours} h</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Faktisk tid</span><span>{s.actual_hours} h</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Diff</span><span className={s.actual_hours > s.planned_hours ? 'text-red-500' : 'text-green-600'}>{(s.actual_hours - s.planned_hours).toFixed(1)} h</span></div>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
