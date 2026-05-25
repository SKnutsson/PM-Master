import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from '@/components/ui/dialog';
import { Plus, FilePlus2, FileCheck2, Wallet, ListChecks, Trash2, Pencil, Search, Filter, FolderOpen, FolderArchive, Paperclip, Upload, X, ImageIcon, TrendingUp, TrendingDown, ArrowDownRight, ArrowUpRight, Calendar as CalIcon, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

type AtaStatus = 'Ej skickad' | 'Skickad' | 'Godkänd' | 'Nekad' | 'Fakturerad';
const STATUSES: AtaStatus[] = ['Ej skickad', 'Skickad', 'Godkänd', 'Nekad', 'Fakturerad'];
const ATA_TYPES = ['Tilläggsarbete', 'Ändring', 'Avgående', 'Hinder', 'Övrigt'];

const isCostType = (t: string) => t === 'Avgående';
const signedAmount = (i: { amount: number; material_cost: number; ata_type: string }) => {
  const total = Number(i.amount || 0) + Number(i.material_cost || 0);
  return isCostType(i.ata_type) ? -total : total;
};

const statusStyle: Record<AtaStatus, string> = {
  'Ej skickad': 'bg-muted text-foreground border-border',
  'Skickad': 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  'Godkänd': 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  'Nekad': 'bg-red-500/15 text-red-600 border-red-500/30',
  'Fakturerad': 'bg-primary/15 text-primary border-primary/30',
};

interface AtaItem {
  id: string;
  project_id: string;
  title: string;
  description: string;
  ata_type: string;
  amount: number;
  hours: number;
  material_cost: number;
  date: string | null;
  status: AtaStatus;
  attachments: { url: string; name: string }[];
  created_at: string;
  updated_at: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const itemVariants = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } };

export function AtaView() {
  const { projects } = useProjectDataContext();
  const [items, setItems] = useState<AtaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiveMode, setArchiveMode] = useState<'active' | 'archived'>('active');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AtaItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultProjectId, setDefaultProjectId] = useState<string | undefined>();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ata_items' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setItems((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visibleProjects = useMemo(() => {
    return projects.filter((p) => archiveMode === 'archived' ? p.status === 'Avslutat' : p.status !== 'Avslutat');
  }, [projects, archiveMode]);

  const projectIdSet = useMemo(() => new Set(visibleProjects.map((p) => p.id)), [visibleProjects]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (!projectIdSet.has(i.project_id)) return false;
      if (projectFilter !== 'all' && i.project_id !== projectFilter) return false;
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!i.title.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, projectFilter, statusFilter, search, projectIdSet]);

  // Dashboard KPIs
  const stats = useMemo(() => {
    const inProgress = filtered.filter((i) => ['Ej skickad', 'Skickad'].includes(i.status));
    const notInvoiced = filtered.filter((i) => i.status !== 'Fakturerad' && i.status !== 'Nekad');
    const income = filtered.filter(i => !isCostType(i.ata_type)).reduce((s, i) => s + Number(i.amount || 0) + Number(i.material_cost || 0), 0);
    const cost = filtered.filter(i => isCostType(i.ata_type)).reduce((s, i) => s + Number(i.amount || 0) + Number(i.material_cost || 0), 0);
    const net = income - cost;
    const totalHours = filtered.reduce((s, i) => s + Number(i.hours || 0), 0);
    const decided = filtered.filter((i) => ['Godkänd', 'Nekad', 'Fakturerad'].includes(i.status));
    const approved = filtered.filter((i) => ['Godkänd', 'Fakturerad'].includes(i.status));
    const approvalRate = decided.length > 0 ? (approved.length / decided.length) * 100 : 0;
    return { inProgress: inProgress.length, notInvoiced: notInvoiced.length, income, cost, net, totalHours, approvalRate };
  }, [filtered]);

  // Per-project summary
  const perProject = useMemo(() => {
    const map = new Map<string, { income: number; cost: number; hours: number; count: number }>();
    filtered.forEach((i) => {
      const cur = map.get(i.project_id) || { income: 0, cost: 0, hours: 0, count: 0 };
      const v = Number(i.amount || 0) + Number(i.material_cost || 0);
      if (isCostType(i.ata_type)) cur.cost += v; else cur.income += v;
      cur.hours += Number(i.hours || 0);
      cur.count += 1;
      map.set(i.project_id, cur);
    });
    return Array.from(map.entries()).map(([projectId, v]) => {
      const proj = projects.find((p) => p.id === projectId);
      return { projectId, project: proj, net: v.income - v.cost, ...v };
    }).sort((a, b) => b.net - a.net);
  }, [filtered, projects]);

  const handleDelete = async (id: string) => {
    if (!confirm('Ta bort denna ÄTA?')) return;
    const { error } = await supabase.from('ata_items' as any).delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('ÄTA borttagen'); load(); }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ÄTA-hantering</h1>
          <p className="text-sm text-muted-foreground">Tilläggs-, ändrings- och avgående arbeten per projekt</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={archiveMode} onValueChange={(v) => setArchiveMode(v as any)}>
            <TabsList>
              <TabsTrigger value="active" className="gap-1.5 text-xs"><FolderOpen className="h-3.5 w-3.5" />Aktiva</TabsTrigger>
              <TabsTrigger value="archived" className="gap-1.5 text-xs"><FolderArchive className="h-3.5 w-3.5" />Arkiverade</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => { setEditing(null); setDefaultProjectId(undefined); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> Ny ÄTA
          </Button>
        </div>
      </div>

      {/* KPI dashboard */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="Pågående ÄTA" value={String(stats.inProgress)} icon={<FilePlus2 className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Intäkter" value={`${stats.income.toLocaleString('sv-SE')} kr`} icon={<TrendingUp className="h-4 w-4" />} accent="green" />
        <KpiCard label="Kostnader" value={`${stats.cost.toLocaleString('sv-SE')} kr`} icon={<TrendingDown className="h-4 w-4" />} accent="red" />
        <KpiCard label="Netto" value={`${stats.net.toLocaleString('sv-SE')} kr`} sub={`${stats.totalHours} h totalt`} icon={<Wallet className="h-4 w-4" />} accent={stats.net >= 0 ? 'primary' : 'red'} />
        <KpiCard label="Godkännandegrad" value={`${stats.approvalRate.toFixed(0)}%`} sub={`${stats.notInvoiced} ej fakturerade`} icon={<ListChecks className="h-4 w-4" />} accent="amber" />
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/60">
          <CardContent className="p-3 flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Sök på titel eller beskrivning…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[220px] h-8 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="Alla projekt" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla projekt</SelectItem>
                {visibleProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.code ? `${p.code} – ` : ''}{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Alla statusar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla statusar</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </motion.div>

      {/* Project groups with visual ÄTA cards */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Laddar…</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
            <FilePlus2 className="h-8 w-8 opacity-30" />
            Inga ÄTA-poster. Klicka "Ny ÄTA" för att lägga till.
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={itemVariants} className="space-y-4">
          {perProject.map((group) => {
            const projItems = filtered.filter((i) => i.project_id === group.projectId);
            return (
              <Card key={group.projectId} className="border-border/60 overflow-hidden">
                <CardHeader className="pb-3 pt-4 bg-gradient-to-r from-muted/40 to-transparent">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {group.project ? `${group.project.code ? group.project.code + ' – ' : ''}${group.project.name}` : 'Okänt projekt'}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{group.count} ÄTA · {group.hours}h</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-muted-foreground">Intäkt</span>
                        <span className="font-semibold tabular-nums text-emerald-600">+{group.income.toLocaleString('sv-SE')} kr</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
                        <span className="text-muted-foreground">Kostnad</span>
                        <span className="font-semibold tabular-nums text-red-600">−{group.cost.toLocaleString('sv-SE')} kr</span>
                      </div>
                      <div className="flex items-center gap-1.5 border-l pl-4">
                        <span className="text-muted-foreground">Netto</span>
                        <span className={cn('font-bold tabular-nums', group.net >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                          {group.net >= 0 ? '+' : '−'}{Math.abs(group.net).toLocaleString('sv-SE')} kr
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                    {projItems.map((i) => {
                      const total = Number(i.amount || 0) + Number(i.material_cost || 0);
                      const isCost = isCostType(i.ata_type);
                      return (
                        <button
                          key={i.id}
                          onClick={() => { setEditing(i); setDialogOpen(true); }}
                          className={cn(
                            'group text-left rounded-lg border bg-card hover:shadow-md transition-all p-3 flex flex-col gap-2 relative overflow-hidden',
                            isCost ? 'border-red-500/30 hover:border-red-500/60' : 'border-emerald-500/30 hover:border-emerald-500/60'
                          )}
                        >
                          <div className={cn('absolute left-0 top-0 bottom-0 w-1', isCost ? 'bg-red-500' : 'bg-emerald-500')} />
                          <div className="flex items-start justify-between gap-2 pl-1">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                <span className={cn(
                                  'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
                                  isCost ? 'bg-red-500/15 text-red-600' : 'bg-emerald-500/15 text-emerald-600'
                                )}>
                                  {isCost ? <ArrowDownRight className="h-2.5 w-2.5" /> : <ArrowUpRight className="h-2.5 w-2.5" />}
                                  {isCost ? 'Kostnad' : 'Intäkt'}
                                </span>
                                <span className="text-[10px] text-muted-foreground">{i.ata_type || '–'}</span>
                              </div>
                              <h4 className="text-sm font-semibold truncate">{i.title}</h4>
                              {i.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{i.description}</p>}
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-0.5">
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditing(i); setDialogOpen(true); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(i.id); }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-end justify-between pl-1 mt-auto">
                            <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
                              {i.date && <span className="inline-flex items-center gap-1"><CalIcon className="h-3 w-3" />{i.date}</span>}
                              {Number(i.hours) > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{i.hours}h</span>}
                              {i.attachments?.length > 0 && <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3" />{i.attachments.length}</span>}
                            </div>
                            <div className="text-right">
                              <div className={cn('text-base font-bold tabular-nums leading-none', isCost ? 'text-red-600' : 'text-emerald-600')}>
                                {isCost ? '−' : '+'}{total.toLocaleString('sv-SE')} kr
                              </div>
                              <span className={cn('inline-block mt-1 text-[9px] font-semibold border rounded-full px-1.5 py-0.5', statusStyle[i.status])}>{i.status}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>
      )}

      <AtaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editing}
        projects={visibleProjects}
        defaultProjectId={defaultProjectId}
        onSaved={load}
      />
    </motion.div>
  );
}

function KpiCard({ label, value, sub, icon, accent }: { label: string; value: string; sub?: string; icon: React.ReactNode; accent: 'blue' | 'amber' | 'green' | 'primary' | 'red' }) {
  const map = {
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-600',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-600',
    green: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600',
    red: 'from-red-500/20 to-red-500/5 text-red-600',
    primary: 'from-primary/20 to-primary/5 text-primary',
  } as const;
  return (
    <Card className={cn('border bg-gradient-to-br', map[accent])}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider font-semibold opacity-80">{label}</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
        </div>
        <div className="rounded-md p-2 bg-background/60">{icon}</div>
      </CardContent>
    </Card>
  );
}

function AtaDialog({ open, onOpenChange, item, projects, defaultProjectId, onSaved }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item: AtaItem | null;
  projects: any[];
  defaultProjectId?: string;
  onSaved: () => void;
}) {
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ataType, setAtaType] = useState('Tilläggsarbete');
  const [amount, setAmount] = useState('0');
  const [hours, setHours] = useState('0');
  const [materialCost, setMaterialCost] = useState('0');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<AtaStatus>('Ej skickad');
  const [attachments, setAttachments] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setProjectId(item.project_id);
      setTitle(item.title);
      setDescription(item.description || '');
      setAtaType(item.ata_type || 'Tilläggsarbete');
      setAmount(String(item.amount ?? 0));
      setHours(String(item.hours ?? 0));
      setMaterialCost(String(item.material_cost ?? 0));
      setDate(item.date || '');
      setStatus(item.status);
      setAttachments(item.attachments || []);
    } else {
      setProjectId(defaultProjectId || projects[0]?.id || '');
      setTitle(''); setDescription(''); setAtaType('Tilläggsarbete');
      setAmount('0'); setHours('0'); setMaterialCost('0');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setStatus('Ej skickad'); setAttachments([]);
    }
  }, [open, item, defaultProjectId, projects]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: { url: string; name: string }[] = [];
    for (const file of Array.from(files)) {
      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error } = await supabase.storage.from('ata-attachments').upload(path, file);
      if (error) { toast.error(error.message); continue; }
      const { data } = supabase.storage.from('ata-attachments').getPublicUrl(path);
      uploaded.push({ url: data.publicUrl, name: file.name });
    }
    setAttachments((prev) => [...prev, ...uploaded]);
    setUploading(false);
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!projectId || !title.trim()) { toast.error('Projekt och titel krävs'); return; }
    setSaving(true);
    const payload = {
      project_id: projectId,
      title: title.trim(),
      description,
      ata_type: ataType,
      amount: parseFloat(amount) || 0,
      hours: parseFloat(hours) || 0,
      material_cost: parseFloat(materialCost) || 0,
      date: date || null,
      status,
      attachments,
    };
    let res;
    if (item) {
      res = await supabase.from('ata_items' as any).update(payload).eq('id', item.id);
    } else {
      res = await supabase.from('ata_items' as any).insert(payload);
    }
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    if (item && item.status !== status) {
      await supabase.from('ata_events' as any).insert({ ata_id: item.id, event: 'status_change', from_value: item.status, to_value: status });
    }
    toast.success('ÄTA sparad');
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Redigera ÄTA' : 'Ny ÄTA'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Projekt</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Välj projekt" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.code ? `${p.code} – ` : ''}{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Typ av ÄTA</Label>
              <Select value={ataType} onValueChange={setAtaType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{ATA_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Titel</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kort titel…" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Beskrivning</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Beskriv arbetet…" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Belopp (kr)</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Timmar</Label>
              <Input type="number" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Material (kr)</Label>
              <Input type="number" step="0.01" value={materialCost} onChange={(e) => setMaterialCost(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Datum</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AtaStatus)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bilagor</Label>
            <div className="flex flex-wrap gap-2">
              {attachments.map((a, idx) => (
                <div key={idx} className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1 text-xs">
                  <a href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:underline">
                    <ImageIcon className="h-3 w-3" /> {a.name}
                  </a>
                  <button type="button" onClick={() => removeAttachment(idx)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-primary hover:underline">
              <Upload className="h-3.5 w-3.5" />
              {uploading ? 'Laddar upp…' : 'Lägg till fil(er)'}
              <input type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} disabled={uploading} />
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Sparar…' : 'Spara'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
