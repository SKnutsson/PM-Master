import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import {
  DollarSign, Plus, Trash2, Download, Archive, RotateCcw, ChevronDown, ChevronRight, Pencil
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  code: string | null;
  customer: string;
  status: string;
}

interface FinanceEntry {
  id: string;
  project_id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  created_at: string;
}

export function FinanceView() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [finances, setFinances] = useState<FinanceEntry[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editEntry, setEditEntry] = useState<FinanceEntry | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [category, setCategory] = useState('Kostnad');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const loadData = useCallback(async () => {
    const [projRes, finRes] = await Promise.all([
      supabase.from('projects').select('id, name, code, customer, status').order('sort_order'),
      supabase.from('project_finances').select('*').order('date', { ascending: false }),
    ]);
    setProjects(projRes.data || []);
    setFinances(finRes.data || []);
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('finance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_finances' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const filteredProjects = projects.filter(p =>
    showArchived ? p.status === 'Avslutat' : p.status !== 'Avslutat'
  );

  const getProjectFinances = (projectId: string) =>
    finances.filter(f => f.project_id === projectId);

  const getProjectTotal = (projectId: string) => {
    const items = getProjectFinances(projectId);
    const costs = items.filter(f => f.category === 'Kostnad').reduce((s, f) => s + f.amount, 0);
    const income = items.filter(f => f.category === 'Intäkt').reduce((s, f) => s + f.amount, 0);
    return { costs, income, net: income - costs };
  };

  const resetForm = () => {
    setSelectedProjectId('');
    setCategory('Kostnad');
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setEditEntry(null);
  };

  const handleSave = async () => {
    const pid = editEntry ? editEntry.project_id : selectedProjectId;
    if (!pid || !description.trim() || !amount) return;

    if (editEntry) {
      const { error } = await supabase.from('project_finances').update({
        category, description: description.trim(), amount: parseFloat(amount), date,
      }).eq('id', editEntry.id);
      if (error) { toast({ title: 'Fel', description: error.message, variant: 'destructive' }); return; }
    } else {
      const { error } = await supabase.from('project_finances').insert({
        project_id: pid, category, description: description.trim(),
        amount: parseFloat(amount), date, created_by: user?.id,
      });
      if (error) { toast({ title: 'Fel', description: error.message, variant: 'destructive' }); return; }
    }

    toast({ title: editEntry ? 'Uppdaterad' : 'Tillagd' });
    resetForm();
    setShowAddDialog(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('project_finances').delete().eq('id', id);
    toast({ title: 'Borttagen' });
    loadData();
  };

  const exportToExcel = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const items = getProjectFinances(projectId);
    const totals = getProjectTotal(projectId);

    let csv = '\uFEFF'; // BOM for Excel
    csv += `Projektredovisning - ${project.code || ''} ${project.name}\n`;
    csv += `Kund: ${project.customer}\n\n`;
    csv += 'Datum;Kategori;Beskrivning;Belopp (SEK)\n';
    items.forEach(item => {
      csv += `${item.date};${item.category};${item.description};${item.amount}\n`;
    });
    csv += `\n;;Totala kostnader;${totals.costs}\n`;
    csv += `;;Totala intäkter;${totals.income}\n`;
    csv += `;;Netto;${totals.net}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.code || project.name}_ekonomi.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ekonomi</h1>
          <p className="text-sm text-muted-foreground">Projektuppföljning – kostnader & intäkter</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showArchived ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className="gap-1.5"
          >
            <Archive className="h-4 w-4" />
            {showArchived ? 'Visa aktiva' : 'Arkiverade'}
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setShowAddDialog(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Ny post
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(() => {
          const allCosts = finances.filter(f => f.category === 'Kostnad').reduce((s, f) => s + f.amount, 0);
          const allIncome = finances.filter(f => f.category === 'Intäkt').reduce((s, f) => s + f.amount, 0);
          return (
            <>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Totala kostnader</p>
                  <p className="text-2xl font-bold text-destructive mt-1">{allCosts.toLocaleString('sv-SE')} SEK</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Totala intäkter</p>
                  <p className="text-2xl font-bold text-primary mt-1">{allIncome.toLocaleString('sv-SE')} SEK</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Netto</p>
                  <p className={`text-2xl font-bold mt-1 ${allIncome - allCosts >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {(allIncome - allCosts).toLocaleString('sv-SE')} SEK
                  </p>
                </CardContent>
              </Card>
            </>
          );
        })()}
      </div>

      {/* Project list */}
      <div className="space-y-2">
        {filteredProjects.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-8 text-center text-muted-foreground">
              {showArchived ? 'Inga arkiverade projekt' : 'Inga aktiva projekt'}
            </CardContent>
          </Card>
        ) : (
          filteredProjects.map(project => {
            const totals = getProjectTotal(project.id);
            const items = getProjectFinances(project.id);
            const isExpanded = expandedProject === project.id;

            return (
              <Card key={project.id} className="border-border/50 overflow-hidden">
                <button
                  onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {project.code && <span className="text-muted-foreground mr-2">{project.code}</span>}
                          {project.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{project.customer}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Kostnader</p>
                        <p className="text-sm font-semibold text-destructive">{totals.costs.toLocaleString('sv-SE')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Intäkter</p>
                        <p className="text-sm font-semibold text-primary">{totals.income.toLocaleString('sv-SE')}</p>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="text-xs text-muted-foreground">Netto</p>
                        <p className={`text-sm font-bold ${totals.net >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {totals.net.toLocaleString('sv-SE')}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-border/30"
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-muted-foreground">{items.length} poster</p>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => exportToExcel(project.id)} className="gap-1.5">
                              <Download className="h-3.5 w-3.5" />
                              Exportera
                            </Button>
                            <Button size="sm" onClick={() => { resetForm(); setSelectedProjectId(project.id); setShowAddDialog(true); }} className="gap-1.5">
                              <Plus className="h-3.5 w-3.5" />
                              Lägg till
                            </Button>
                          </div>
                        </div>
                        {items.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4 italic">Inga poster ännu</p>
                        ) : (
                          <div className="rounded-lg border border-border/30 overflow-hidden">
                            <div className="grid grid-cols-[100px_80px_1fr_120px_60px] gap-2 px-3 py-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider bg-muted/30">
                              <span>Datum</span>
                              <span>Kategori</span>
                              <span>Beskrivning</span>
                              <span className="text-right">Belopp</span>
                              <span></span>
                            </div>
                            {items.map(item => (
                              <div key={item.id} className="grid grid-cols-[100px_80px_1fr_120px_60px] gap-2 px-3 py-2 text-sm items-center hover:bg-muted/20 border-t border-border/20 group">
                                <span className="text-muted-foreground text-xs">{item.date}</span>
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full inline-flex items-center justify-center w-fit ${item.category === 'Kostnad' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                                  {item.category}
                                </span>
                                <span className="truncate">{item.description}</span>
                                <span className={`text-right font-semibold ${item.category === 'Kostnad' ? 'text-destructive' : 'text-primary'}`}>
                                  {item.category === 'Kostnad' ? '-' : '+'}{item.amount.toLocaleString('sv-SE')}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => {
                                      setEditEntry(item);
                                      setCategory(item.category);
                                      setDescription(item.description);
                                      setAmount(String(item.amount));
                                      setDate(item.date);
                                      setShowAddDialog(true);
                                    }}
                                    className="p-1 rounded hover:bg-muted"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                  </button>
                                  <button onClick={() => handleDelete(item.id)} className="p-1 rounded hover:bg-destructive/10">
                                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })
        )}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowAddDialog(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editEntry ? 'Redigera post' : 'Ny ekonomipost'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editEntry && (
              <div>
                <label className="text-sm font-medium mb-1 block">Projekt</label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger><SelectValue placeholder="Välj projekt" /></SelectTrigger>
                  <SelectContent>
                    {projects.filter(p => p.status !== 'Avslutat').map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.code ? `${p.code} – ` : ''}{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Kategori</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kostnad">Kostnad</SelectItem>
                  <SelectItem value="Intäkt">Intäkt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Beskrivning</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="T.ex. Material, Resekostnad..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Belopp (SEK)</label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Datum</label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowAddDialog(false); }}>Avbryt</Button>
            <Button onClick={handleSave} disabled={!description.trim() || !amount || (!editEntry && !selectedProjectId)}>
              {editEntry ? 'Uppdatera' : 'Spara'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
