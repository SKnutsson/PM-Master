import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  Plus, Trash2, Download, Archive, ChevronDown, ChevronRight,
  Settings2, ArrowLeft, Pencil, FileText, ChevronUp
} from 'lucide-react';

interface Project {
  id: string; name: string; code: string | null; customer: string; status: string;
}
interface Template {
  id: string; name: string;
}
interface TemplateItem {
  id: string; template_id: string; name: string; item_type: string; sort_order: number;
}
interface ProjectAccounting {
  id: string; project_id: string; template_id: string;
}
interface BudgetLine {
  id: string; project_accounting_id: string; template_item_id: string; budgeted_amount: number;
}
interface Transaction {
  id: string; budget_line_id: string; amount: number; date: string; note: string | null; created_at: string;
}

export function FinanceView() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Template management
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [editTemplateItems, setEditTemplateItems] = useState<{ name: string; item_type: string }[]>([]);

  // Project accounting
  const [projectAccounting, setProjectAccounting] = useState<ProjectAccounting | null>(null);
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expandedLine, setExpandedLine] = useState<string | null>(null);

  // Transaction dialog
  const [showTxDialog, setShowTxDialog] = useState(false);
  const [txBudgetLineId, setTxBudgetLineId] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txNote, setTxNote] = useState('');

  // Budget edit
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState('');

  const loadProjects = useCallback(async () => {
    const { data } = await supabase.from('projects').select('id, name, code, customer, status').order('sort_order');
    setProjects(data || []);
  }, []);

  const loadTemplates = useCallback(async () => {
    const [tRes, tiRes] = await Promise.all([
      supabase.from('finance_templates').select('*').order('created_at'),
      supabase.from('finance_template_items').select('*').order('sort_order'),
    ]);
    setTemplates(tRes.data || []);
    setTemplateItems(tiRes.data || []);
  }, []);

  const loadProjectAccounting = useCallback(async (projectId: string) => {
    const { data: acct } = await supabase.from('project_accounting').select('*').eq('project_id', projectId).maybeSingle();
    setProjectAccounting(acct);
    if (acct) {
      const [blRes, txRes] = await Promise.all([
        supabase.from('project_budget_lines').select('*').eq('project_accounting_id', acct.id),
        supabase.from('project_transactions').select('*').eq('budget_line_id', 'placeholder-to-get-schema'),
      ]);
      // Load budget lines
      const lines = blRes.data || [];
      setBudgetLines(lines);
      // Load all transactions for these lines
      if (lines.length > 0) {
        const { data: txData } = await supabase.from('project_transactions')
          .select('*')
          .in('budget_line_id', lines.map(l => l.id))
          .order('date', { ascending: false });
        setTransactions(txData || []);
      } else {
        setTransactions([]);
      }
    } else {
      setBudgetLines([]);
      setTransactions([]);
    }
  }, []);

  useEffect(() => {
    loadProjects();
    loadTemplates();
  }, [loadProjects, loadTemplates]);

  useEffect(() => {
    if (selectedProject) {
      loadProjectAccounting(selectedProject.id);
    }
  }, [selectedProject, loadProjectAccounting]);

  const filteredProjects = projects.filter(p =>
    showArchived ? p.status === 'Avslutat' : p.status !== 'Avslutat'
  );

  // --- Template management ---
  const openNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setEditTemplateItems([{ name: '', item_type: 'Kostnad' }]);
    setShowTemplateDialog(true);
  };

  const openEditTemplate = (t: Template) => {
    setEditingTemplate(t);
    setTemplateName(t.name);
    const items = templateItems.filter(i => i.template_id === t.id).sort((a, b) => a.sort_order - b.sort_order);
    setEditTemplateItems(items.map(i => ({ name: i.name, item_type: i.item_type })));
    setShowTemplateDialog(true);
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) return;
    const validItems = editTemplateItems.filter(i => i.name.trim());
    if (validItems.length === 0) { toast({ title: 'Lägg till minst en post', variant: 'destructive' }); return; }

    if (editingTemplate) {
      await supabase.from('finance_templates').update({ name: templateName.trim() }).eq('id', editingTemplate.id);
      await supabase.from('finance_template_items').delete().eq('template_id', editingTemplate.id);
      await supabase.from('finance_template_items').insert(
        validItems.map((item, i) => ({ template_id: editingTemplate.id, name: item.name.trim(), item_type: item.item_type, sort_order: i }))
      );
    } else {
      const { data: newTemplate } = await supabase.from('finance_templates').insert({ name: templateName.trim(), created_by: user?.id }).select().single();
      if (newTemplate) {
        await supabase.from('finance_template_items').insert(
          validItems.map((item, i) => ({ template_id: newTemplate.id, name: item.name.trim(), item_type: item.item_type, sort_order: i }))
        );
      }
    }
    toast({ title: editingTemplate ? 'Mall uppdaterad' : 'Mall skapad' });
    setShowTemplateDialog(false);
    loadTemplates();
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from('finance_templates').delete().eq('id', id);
    toast({ title: 'Mall borttagen' });
    loadTemplates();
  };

  // --- Assign template to project ---
  const assignTemplate = async (templateId: string) => {
    if (!selectedProject) return;
    // Create project_accounting
    const { data: acct } = await supabase.from('project_accounting').insert({
      project_id: selectedProject.id, template_id: templateId,
    }).select().single();
    if (!acct) return;

    // Create budget lines for each template item
    const items = templateItems.filter(i => i.template_id === templateId);
    if (items.length > 0) {
      await supabase.from('project_budget_lines').insert(
        items.map(item => ({ project_accounting_id: acct.id, template_item_id: item.id, budgeted_amount: 0 }))
      );
    }
    toast({ title: 'Mall tilldelad' });
    loadProjectAccounting(selectedProject.id);
  };

  // --- Budget ---
  const saveBudget = async (lineId: string) => {
    await supabase.from('project_budget_lines').update({ budgeted_amount: parseFloat(budgetValue) || 0 }).eq('id', lineId);
    setEditingBudget(null);
    if (selectedProject) loadProjectAccounting(selectedProject.id);
  };

  // --- Transactions ---
  const addTransaction = async () => {
    if (!txBudgetLineId || !txAmount) return;
    await supabase.from('project_transactions').insert({
      budget_line_id: txBudgetLineId, amount: parseFloat(txAmount), date: txDate, note: txNote.trim() || null,
    });
    toast({ title: 'Transaktion tillagd' });
    setShowTxDialog(false);
    setTxAmount(''); setTxNote(''); setTxDate(new Date().toISOString().split('T')[0]);
    if (selectedProject) loadProjectAccounting(selectedProject.id);
  };

  const deleteTransaction = async (id: string) => {
    await supabase.from('project_transactions').delete().eq('id', id);
    toast({ title: 'Transaktion borttagen' });
    if (selectedProject) loadProjectAccounting(selectedProject.id);
  };

  // --- Export ---
  const exportProject = () => {
    if (!selectedProject || !projectAccounting) return;
    const items = templateItems.filter(i => i.template_id === projectAccounting.template_id).sort((a, b) => a.sort_order - b.sort_order);

    let csv = '\uFEFF';
    csv += `Projektredovisning - ${selectedProject.code || ''} ${selectedProject.name}\n`;
    csv += `Kund: ${selectedProject.customer}\n\n`;
    csv += 'Post;Typ;Budget;Utfall;Avvikelse\n';

    let totalBudgetCost = 0, totalBudgetIncome = 0, totalActualCost = 0, totalActualIncome = 0;

    items.forEach(item => {
      const line = budgetLines.find(l => l.template_item_id === item.id);
      if (!line) return;
      const budget = line.budgeted_amount;
      const actual = transactions.filter(t => t.budget_line_id === line.id).reduce((s, t) => s + t.amount, 0);
      const diff = budget - actual;
      csv += `${item.name};${item.item_type};${budget};${actual};${diff}\n`;
      if (item.item_type === 'Kostnad') { totalBudgetCost += budget; totalActualCost += actual; }
      else { totalBudgetIncome += budget; totalActualIncome += actual; }
    });

    csv += `\nTotalt kostnader;;${totalBudgetCost};${totalActualCost};${totalBudgetCost - totalActualCost}\n`;
    csv += `Totalt intäkter;;${totalBudgetIncome};${totalActualIncome};${totalBudgetIncome - totalActualIncome}\n`;
    csv += `Netto;;${totalBudgetIncome - totalBudgetCost};${totalActualIncome - totalActualCost};${(totalBudgetIncome - totalBudgetCost) - (totalActualIncome - totalActualCost)}\n`;

    // Transaction details
    csv += `\n\nTransaktionsdetaljer\n`;
    csv += `Post;Datum;Belopp;Notering\n`;
    items.forEach(item => {
      const line = budgetLines.find(l => l.template_item_id === item.id);
      if (!line) return;
      const txs = transactions.filter(t => t.budget_line_id === line.id);
      txs.forEach(tx => {
        csv += `${item.name};${tx.date};${tx.amount};${tx.note || ''}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedProject.code || selectedProject.name}_projektredovisning.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Detach template ---
  const detachTemplate = async () => {
    if (!projectAccounting) return;
    await supabase.from('project_accounting').delete().eq('id', projectAccounting.id);
    toast({ title: 'Mall bortkopplad' });
    if (selectedProject) loadProjectAccounting(selectedProject.id);
  };

  // --- Render helpers ---
  const getLineActual = (lineId: string) =>
    transactions.filter(t => t.budget_line_id === lineId).reduce((s, t) => s + t.amount, 0);

  const getLineTxs = (lineId: string) =>
    transactions.filter(t => t.budget_line_id === lineId).sort((a, b) => b.date.localeCompare(a.date));

  // ===== PROJECT DETAIL VIEW =====
  if (selectedProject) {
    const acctItems = projectAccounting
      ? templateItems.filter(i => i.template_id === projectAccounting.template_id).sort((a, b) => a.sort_order - b.sort_order)
      : [];

    const costItems = acctItems.filter(i => i.item_type === 'Kostnad');
    const incomeItems = acctItems.filter(i => i.item_type === 'Intäkt');

    const totalBudgetCost = costItems.reduce((s, i) => {
      const line = budgetLines.find(l => l.template_item_id === i.id);
      return s + (line?.budgeted_amount || 0);
    }, 0);
    const totalActualCost = costItems.reduce((s, i) => {
      const line = budgetLines.find(l => l.template_item_id === i.id);
      return s + (line ? getLineActual(line.id) : 0);
    }, 0);
    const totalBudgetIncome = incomeItems.reduce((s, i) => {
      const line = budgetLines.find(l => l.template_item_id === i.id);
      return s + (line?.budgeted_amount || 0);
    }, 0);
    const totalActualIncome = incomeItems.reduce((s, i) => {
      const line = budgetLines.find(l => l.template_item_id === i.id);
      return s + (line ? getLineActual(line.id) : 0);
    }, 0);

    const renderLineGroup = (label: string, items: TemplateItem[], type: string) => (
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</h3>
        {items.map(item => {
          const line = budgetLines.find(l => l.template_item_id === item.id);
          if (!line) return null;
          const actual = getLineActual(line.id);
          const diff = line.budgeted_amount - actual;
          const txs = getLineTxs(line.id);
          const isExpanded = expandedLine === line.id;

          return (
            <Card key={line.id} className="border-border/40 overflow-hidden">
              <button
                onClick={() => setExpandedLine(isExpanded ? null : line.id)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="font-medium text-sm">{item.name}</span>
                    {txs.length > 0 && <span className="text-xs text-muted-foreground">({txs.length})</span>}
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right w-24">
                      <p className="text-[10px] text-muted-foreground">Budget</p>
                      {editingBudget === line.id ? (
                        <Input
                          type="number"
                          value={budgetValue}
                          onChange={e => setBudgetValue(e.target.value)}
                          onBlur={() => saveBudget(line.id)}
                          onKeyDown={e => e.key === 'Enter' && saveBudget(line.id)}
                          onClick={e => e.stopPropagation()}
                          className="h-6 text-xs w-24"
                          autoFocus
                        />
                      ) : (
                        <p
                          className="font-semibold cursor-pointer hover:text-primary"
                          onClick={e => { e.stopPropagation(); setEditingBudget(line.id); setBudgetValue(String(line.budgeted_amount)); }}
                        >
                          {line.budgeted_amount.toLocaleString('sv-SE')}
                        </p>
                      )}
                    </div>
                    <div className="text-right w-24">
                      <p className="text-[10px] text-muted-foreground">Utfall</p>
                      <p className="font-semibold">{actual.toLocaleString('sv-SE')}</p>
                    </div>
                    <div className="text-right w-24">
                      <p className="text-[10px] text-muted-foreground">Avvikelse</p>
                      <p className={`font-semibold ${type === 'Kostnad' ? (diff >= 0 ? 'text-primary' : 'text-destructive') : (diff <= 0 ? 'text-primary' : 'text-destructive')}`}>
                        {diff.toLocaleString('sv-SE')}
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
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden border-t border-border/30"
                  >
                    <div className="p-3 space-y-2">
                      <div className="flex justify-end">
                        <Button size="sm" variant="outline" onClick={() => { setTxBudgetLineId(line.id); setShowTxDialog(true); }} className="gap-1.5 h-7 text-xs">
                          <Plus className="h-3 w-3" /> Lägg till
                        </Button>
                      </div>
                      {txs.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2 italic">Inga transaktioner</p>
                      ) : (
                        <div className="rounded border border-border/30 overflow-hidden">
                          <div className="grid grid-cols-[90px_1fr_100px_32px] gap-2 px-3 py-1.5 text-[10px] text-muted-foreground font-medium uppercase bg-muted/30">
                            <span>Datum</span><span>Notering</span><span className="text-right">Belopp</span><span></span>
                          </div>
                          {txs.map(tx => (
                            <div key={tx.id} className="grid grid-cols-[90px_1fr_100px_32px] gap-2 px-3 py-1.5 text-xs items-center border-t border-border/20 hover:bg-muted/20 group">
                              <span className="text-muted-foreground">{tx.date}</span>
                              <span className="truncate">{tx.note || '—'}</span>
                              <span className="text-right font-semibold">{tx.amount.toLocaleString('sv-SE')}</span>
                              <button onClick={() => deleteTransaction(tx.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10">
                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                              </button>
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
        })}
      </div>
    );

    return (
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedProject(null); setProjectAccounting(null); }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {selectedProject.code && <span className="text-muted-foreground mr-2">{selectedProject.code}</span>}
                {selectedProject.name}
              </h1>
              <p className="text-sm text-muted-foreground">{selectedProject.customer} · Projektredovisning</p>
            </div>
          </div>
          {projectAccounting && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportProject} className="gap-1.5">
                <Download className="h-4 w-4" /> Exportera
              </Button>
              <Button variant="ghost" size="sm" onClick={detachTemplate} className="gap-1.5 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" /> Ta bort mall
              </Button>
            </div>
          )}
        </div>

        {!projectAccounting ? (
          <Card className="border-border/50">
            <CardContent className="p-8 text-center space-y-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <div>
                <p className="font-medium">Ingen mall tilldelad</p>
                <p className="text-sm text-muted-foreground">Välj en mall för att starta projektredovisningen</p>
              </div>
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Skapa en mall först via "Hantera mallar"</p>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Select onValueChange={assignTemplate}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="Välj mall..." /></SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-border/40"><CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase">Budget kostn.</p>
                <p className="text-lg font-bold">{totalBudgetCost.toLocaleString('sv-SE')}</p>
              </CardContent></Card>
              <Card className="border-border/40"><CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase">Utfall kostn.</p>
                <p className="text-lg font-bold">{totalActualCost.toLocaleString('sv-SE')}</p>
              </CardContent></Card>
              <Card className="border-border/40"><CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase">Budget intäkt</p>
                <p className="text-lg font-bold">{totalBudgetIncome.toLocaleString('sv-SE')}</p>
              </CardContent></Card>
              <Card className="border-border/40"><CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase">Netto utfall</p>
                <p className={`text-lg font-bold ${totalActualIncome - totalActualCost >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {(totalActualIncome - totalActualCost).toLocaleString('sv-SE')}
                </p>
              </CardContent></Card>
            </div>

            {/* Cost items */}
            {costItems.length > 0 && renderLineGroup('Kostnader', costItems, 'Kostnad')}
            {incomeItems.length > 0 && renderLineGroup('Intäkter', incomeItems, 'Intäkt')}
          </div>
        )}

        {/* Transaction dialog */}
        <Dialog open={showTxDialog} onOpenChange={setShowTxDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Ny transaktion</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Belopp (SEK)</label>
                  <Input type="number" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Datum</label>
                  <Input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Notering</label>
                <Textarea value={txNote} onChange={e => setTxNote(e.target.value)} placeholder="T.ex. 3 nätter hotell Göteborg..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTxDialog(false)}>Avbryt</Button>
              <Button onClick={addTransaction}>Lägg till</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ===== PROJECT LIST VIEW =====
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ekonomi</h1>
          <p className="text-sm text-muted-foreground">Projektredovisning</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openNewTemplate} className="gap-1.5">
            <Settings2 className="h-4 w-4" /> Hantera mallar
          </Button>
          <Button
            variant={showArchived ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className="gap-1.5"
          >
            <Archive className="h-4 w-4" />
            {showArchived ? 'Visa aktiva' : 'Arkiverade'}
          </Button>
        </div>
      </div>

      {/* Template list (if any) */}
      {templates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {templates.map(t => (
            <div key={t.id} className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted/50 text-xs">
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span>{t.name}</span>
              <span className="text-muted-foreground">({templateItems.filter(i => i.template_id === t.id).length} poster)</span>
              <button onClick={() => openEditTemplate(t)} className="ml-1 hover:text-primary"><Pencil className="h-3 w-3" /></button>
              <button onClick={() => deleteTemplate(t.id)} className="hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Project list */}
      <div className="space-y-1.5">
        {filteredProjects.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-8 text-center text-muted-foreground">
              {showArchived ? 'Inga arkiverade projekt' : 'Inga aktiva projekt'}
            </CardContent>
          </Card>
        ) : (
          filteredProjects.map(project => (
            <Card key={project.id} className="border-border/50 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelectedProject(project)}>
              <div className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {project.code && <span className="text-muted-foreground mr-2">{project.code}</span>}
                    {project.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{project.customer}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Template dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Redigera mall' : 'Ny mall'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Mallnamn</label>
              <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="T.ex. Standardmall" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Poster</label>
              <div className="space-y-2">
                {editTemplateItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={item.name}
                      onChange={e => {
                        const updated = [...editTemplateItems];
                        updated[idx].name = e.target.value;
                        setEditTemplateItems(updated);
                      }}
                      placeholder="T.ex. Hotell, Arbetskostnad..."
                      className="flex-1"
                    />
                    <Select
                      value={item.item_type}
                      onValueChange={v => {
                        const updated = [...editTemplateItems];
                        updated[idx].item_type = v;
                        setEditTemplateItems(updated);
                      }}
                    >
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kostnad">Kostnad</SelectItem>
                        <SelectItem value="Intäkt">Intäkt</SelectItem>
                      </SelectContent>
                    </Select>
                    <button onClick={() => setEditTemplateItems(editTemplateItems.filter((_, i) => i !== idx))} className="p-1 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditTemplateItems([...editTemplateItems, { name: '', item_type: 'Kostnad' }])} className="mt-2 gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Lägg till post
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Avbryt</Button>
            <Button onClick={saveTemplate}>{editingTemplate ? 'Spara' : 'Skapa'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
