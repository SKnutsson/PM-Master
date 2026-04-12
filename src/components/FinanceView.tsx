import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import {
  Plus, Trash2, Download, Archive, ChevronDown, ChevronRight,
  Settings2, ArrowLeft, Pencil, FileText, ArrowUp, ArrowDown
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
  id: string; project_accounting_id: string; template_item_id: string | null; budgeted_amount: number;
  name: string; item_type: string; sort_order: number;
}
interface Transaction {
  id: string; budget_line_id: string; amount: number; date: string; note: string | null; created_at: string;
}

export function FinanceView() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [editTemplateItems, setEditTemplateItems] = useState<{ id?: string; name: string; item_type: string }[]>([]);

  const [projectAccounting, setProjectAccounting] = useState<ProjectAccounting | null>(null);
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expandedLine, setExpandedLine] = useState<string | null>(null);

  const [showTxDialog, setShowTxDialog] = useState(false);
  const [txBudgetLineId, setTxBudgetLineId] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txNote, setTxNote] = useState('');

  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState('');

  const [showAddLineDialog, setShowAddLineDialog] = useState(false);
  const [newLineName, setNewLineName] = useState('');
  const [newLineType, setNewLineType] = useState('Kostnad');

  // Confirmation dialogs
  const [deleteLineConfirm, setDeleteLineConfirm] = useState<{ id: string; name: string; hasTxs: boolean } | null>(null);
  const [deleteTemplateConfirm, setDeleteTemplateConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteTemplateItemConfirm, setDeleteTemplateItemConfirm] = useState<number | null>(null);

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
      const { data: blData } = await supabase.from('project_budget_lines').select('*').eq('project_accounting_id', acct.id).order('sort_order');
      const lines = (blData || []) as BudgetLine[];
      setBudgetLines(lines);
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

  useEffect(() => { loadProjects(); loadTemplates(); }, [loadProjects, loadTemplates]);
  useEffect(() => { if (selectedProject) loadProjectAccounting(selectedProject.id); }, [selectedProject, loadProjectAccounting]);

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
    setEditTemplateItems(items.map(i => ({ id: i.id, name: i.name, item_type: i.item_type })));
    setShowTemplateDialog(true);
  };

  const moveTemplateItem = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= editTemplateItems.length) return;
    const updated = [...editTemplateItems];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setEditTemplateItems(updated);
  };

  const confirmRemoveTemplateItem = (idx: number) => {
    if (editTemplateItems[idx].name.trim()) {
      setDeleteTemplateItemConfirm(idx);
    } else {
      setEditTemplateItems(editTemplateItems.filter((_, i) => i !== idx));
    }
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) return;
    const validItems = editTemplateItems.filter(i => i.name.trim());
    if (validItems.length === 0) { toast({ title: 'Lägg till minst en post', variant: 'destructive' }); return; }

    if (editingTemplate) {
      await supabase.from('finance_templates').update({ name: templateName.trim() }).eq('id', editingTemplate.id);
      // Smart diff: update existing, add new, delete removed (template items only - won't affect project budget lines)
      const existingIds = validItems.filter(i => i.id).map(i => i.id!);
      // Delete items removed from template
      const currentItems = templateItems.filter(i => i.template_id === editingTemplate.id);
      const toDelete = currentItems.filter(i => !existingIds.includes(i.id));
      for (const item of toDelete) {
        await supabase.from('finance_template_items').delete().eq('id', item.id);
      }
      // Update/insert
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        if (item.id) {
          await supabase.from('finance_template_items').update({ name: item.name.trim(), item_type: item.item_type, sort_order: i }).eq('id', item.id);
        } else {
          await supabase.from('finance_template_items').insert({ template_id: editingTemplate.id, name: item.name.trim(), item_type: item.item_type, sort_order: i });
        }
      }
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
    await supabase.from('finance_template_items').delete().eq('template_id', id);
    await supabase.from('finance_templates').delete().eq('id', id);
    toast({ title: 'Mall borttagen' });
    setDeleteTemplateConfirm(null);
    loadTemplates();
  };

  // --- Assign template to project ---
  const assignTemplate = async (templateId: string) => {
    if (!selectedProject) return;
    const { data: acct } = await supabase.from('project_accounting').insert({
      project_id: selectedProject.id, template_id: templateId,
    }).select().single();
    if (!acct) return;

    const items = templateItems.filter(i => i.template_id === templateId).sort((a, b) => a.sort_order - b.sort_order);
    if (items.length > 0) {
      await supabase.from('project_budget_lines').insert(
        items.map((item, idx) => ({
          project_accounting_id: acct.id,
          template_item_id: item.id,
          budgeted_amount: 0,
          name: item.name,
          item_type: item.item_type,
          sort_order: idx,
        }))
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

  // --- Add custom line to project ---
  const addCustomLine = async () => {
    if (!projectAccounting || !newLineName.trim()) return;
    const maxSort = budgetLines.length > 0 ? Math.max(...budgetLines.map(l => l.sort_order)) + 1 : 0;
    await supabase.from('project_budget_lines').insert({
      project_accounting_id: projectAccounting.id,
      template_item_id: null,
      name: newLineName.trim(),
      item_type: newLineType,
      sort_order: maxSort,
      budgeted_amount: 0,
    });
    toast({ title: 'Post tillagd' });
    setShowAddLineDialog(false);
    setNewLineName('');
    setNewLineType('Kostnad');
    if (selectedProject) loadProjectAccounting(selectedProject.id);
  };

  // --- Remove line from project ---
  const removeLine = async (lineId: string) => {
    // Delete associated transactions first
    await supabase.from('project_transactions').delete().eq('budget_line_id', lineId);
    await supabase.from('project_budget_lines').delete().eq('id', lineId);
    toast({ title: 'Post borttagen' });
    setDeleteLineConfirm(null);
    if (selectedProject) loadProjectAccounting(selectedProject.id);
  };

  // --- Export ---
  const exportProject = () => {
    if (!selectedProject || !projectAccounting) return;
    const incomeLines = budgetLines.filter(l => l.item_type === 'Intäkt').sort((a, b) => a.sort_order - b.sort_order);
    const costLines = budgetLines.filter(l => l.item_type === 'Kostnad').sort((a, b) => a.sort_order - b.sort_order);
    const allLines = [...incomeLines, ...costLines];

    let csv = '\uFEFF';
    csv += `Projektredovisning - ${selectedProject.code || ''} ${selectedProject.name}\n`;
    csv += `Kund: ${selectedProject.customer}\n\n`;
    csv += 'Post;Typ;Budget;Utfall;Avvikelse\n';

    let totalBudgetCost = 0, totalBudgetIncome = 0, totalActualCost = 0, totalActualIncome = 0;

    allLines.forEach(line => {
      const actual = getLineActual(line.id);
      const diff = line.budgeted_amount - actual;
      csv += `${line.name};${line.item_type};${line.budgeted_amount};${actual};${diff}\n`;
      if (line.item_type === 'Kostnad') { totalBudgetCost += line.budgeted_amount; totalActualCost += actual; }
      else { totalBudgetIncome += line.budgeted_amount; totalActualIncome += actual; }
    });

    csv += `\nTotalt kostnader;;${totalBudgetCost};${totalActualCost};${totalBudgetCost - totalActualCost}\n`;
    csv += `Totalt intäkter;;${totalBudgetIncome};${totalActualIncome};${totalBudgetIncome - totalActualIncome}\n`;
    csv += `Netto;;${totalBudgetIncome - totalBudgetCost};${totalActualIncome - totalActualCost};${(totalBudgetIncome - totalBudgetCost) - (totalActualIncome - totalActualCost)}\n`;

    csv += `\n\nTransaktionsdetaljer\n`;
    csv += `Post;Datum;Belopp;Notering\n`;
    allLines.forEach(line => {
      const txs = getLineTxs(line.id);
      txs.forEach(tx => {
        csv += `${line.name};${tx.date};${tx.amount};${tx.note || ''}\n`;
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

  const detachTemplate = async () => {
    if (!projectAccounting) return;
    await supabase.from('project_accounting').delete().eq('id', projectAccounting.id);
    toast({ title: 'Mall bortkopplad' });
    if (selectedProject) loadProjectAccounting(selectedProject.id);
  };

  const getLineActual = (lineId: string) =>
    transactions.filter(t => t.budget_line_id === lineId).reduce((s, t) => s + t.amount, 0);

  const getLineTxs = (lineId: string) =>
    transactions.filter(t => t.budget_line_id === lineId).sort((a, b) => b.date.localeCompare(a.date));

  const fmt = (n: number) => n.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // ===== PROJECT DETAIL VIEW =====
  if (selectedProject) {
    const incomeLines = budgetLines.filter(l => l.item_type === 'Intäkt').sort((a, b) => a.sort_order - b.sort_order);
    const costLines = budgetLines.filter(l => l.item_type === 'Kostnad').sort((a, b) => a.sort_order - b.sort_order);

    const sumBudget = (lines: BudgetLine[]) => lines.reduce((s, l) => s + l.budgeted_amount, 0);
    const sumActual = (lines: BudgetLine[]) => lines.reduce((s, l) => s + getLineActual(l.id), 0);

    const totalBudgetIncome = sumBudget(incomeLines);
    const totalActualIncome = sumActual(incomeLines);
    const totalBudgetCost = sumBudget(costLines);
    const totalActualCost = sumActual(costLines);

    const renderTableSection = (label: string, lines: BudgetLine[], type: string) => (
      <>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableCell colSpan={5} className="font-semibold text-xs uppercase tracking-wider py-1.5 pl-3 text-muted-foreground border-b border-border">
            {label}
          </TableCell>
        </TableRow>
        {lines.map(line => {
          const actual = getLineActual(line.id);
          const diff = line.budgeted_amount - actual;
          const txs = getLineTxs(line.id);
          const isExpanded = expandedLine === line.id;

          return (
            <React.Fragment key={line.id}>
              <TableRow
                className="cursor-pointer hover:bg-muted/30 transition-colors group"
                onClick={() => setExpandedLine(isExpanded ? null : line.id)}
              >
                <TableCell className="py-1.5 pl-3 pr-2 w-[40%]">
                  <div className="flex items-center gap-1.5">
                    {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                    <span className="text-sm font-medium truncate">{line.name}</span>
                    {txs.length > 0 && <span className="text-[10px] text-muted-foreground">({txs.length})</span>}
                  </div>
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-sm tabular-nums w-[18%]">
                  {editingBudget === line.id ? (
                    <Input
                      type="number"
                      value={budgetValue}
                      onChange={e => setBudgetValue(e.target.value)}
                      onBlur={() => saveBudget(line.id)}
                      onKeyDown={e => e.key === 'Enter' && saveBudget(line.id)}
                      onClick={e => e.stopPropagation()}
                      className="h-6 text-xs w-24 ml-auto text-right"
                      autoFocus
                    />
                  ) : (
                    <span
                      className="cursor-pointer hover:text-primary"
                      onClick={e => { e.stopPropagation(); setEditingBudget(line.id); setBudgetValue(String(line.budgeted_amount)); }}
                    >
                      {fmt(line.budgeted_amount)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-1.5 text-right font-mono text-sm tabular-nums w-[18%]">
                  {fmt(actual)}
                </TableCell>
                <TableCell className={`py-1.5 text-right font-mono text-sm tabular-nums w-[18%] font-semibold ${type === 'Kostnad' ? (diff >= 0 ? 'text-primary' : 'text-destructive') : (diff <= 0 ? 'text-primary' : 'text-destructive')}`}>
                  {fmt(diff)}
                </TableCell>
                <TableCell className="py-1.5 w-8 text-center">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setDeleteLineConfirm({ id: line.id, name: line.name, hasTxs: txs.length > 0 });
                    }}
                    className="p-0.5 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </TableCell>
              </TableRow>
              <AnimatePresence>
                {isExpanded && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="p-0">
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="px-8 py-2 space-y-1.5 bg-muted/10 border-t border-border/30">
                          <div className="flex justify-end">
                            <Button size="sm" variant="outline" onClick={() => { setTxBudgetLineId(line.id); setShowTxDialog(true); }} className="gap-1 h-6 text-[11px]">
                              <Plus className="h-3 w-3" /> Lägg till
                            </Button>
                          </div>
                          {txs.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-1 italic">Inga transaktioner</p>
                          ) : (
                            <div className="rounded border border-border/30 overflow-hidden text-xs">
                              <div className="grid grid-cols-[80px_1fr_90px_28px] gap-1 px-2 py-1 text-[10px] text-muted-foreground font-medium uppercase bg-muted/30">
                                <span>Datum</span><span>Notering</span><span className="text-right">Belopp</span><span></span>
                              </div>
                              {txs.map(tx => (
                                <div key={tx.id} className="grid grid-cols-[80px_1fr_90px_28px] gap-1 px-2 py-1 items-center border-t border-border/20 hover:bg-muted/20 group/tx">
                                  <span className="text-muted-foreground">{tx.date}</span>
                                  <span className="truncate">{tx.note || '—'}</span>
                                  <span className="text-right font-mono tabular-nums">{fmt(tx.amount)}</span>
                                  <button onClick={() => deleteTransaction(tx.id)} className="opacity-0 group-hover/tx:opacity-100 p-0.5 rounded hover:bg-destructive/10">
                                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </TableCell>
                  </TableRow>
                )}
              </AnimatePresence>
            </React.Fragment>
          );
        })}
        {/* Section total */}
        <TableRow className="bg-muted/20 hover:bg-muted/20 border-t-2 border-border">
          <TableCell className="py-1.5 pl-3 font-semibold text-sm">Summa {label.toLowerCase()}</TableCell>
          <TableCell className="py-1.5 text-right font-mono text-sm font-semibold tabular-nums">{fmt(sumBudget(lines))}</TableCell>
          <TableCell className="py-1.5 text-right font-mono text-sm font-semibold tabular-nums">{fmt(sumActual(lines))}</TableCell>
          <TableCell className="py-1.5 text-right font-mono text-sm font-semibold tabular-nums">{fmt(sumBudget(lines) - sumActual(lines))}</TableCell>
          <TableCell className="w-8"></TableCell>
        </TableRow>
      </>
    );

    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedProject(null); setProjectAccounting(null); }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {selectedProject.code && <span className="text-muted-foreground mr-2">{selectedProject.code}</span>}
                {selectedProject.name}
              </h1>
              <p className="text-xs text-muted-foreground">{selectedProject.customer} · Projektredovisning</p>
            </div>
          </div>
          {projectAccounting && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddLineDialog(true)} className="gap-1.5 h-8 text-xs">
                <Plus className="h-3.5 w-3.5" /> Post
              </Button>
              <Button variant="outline" size="sm" onClick={exportProject} className="gap-1.5 h-8 text-xs">
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
              <Button variant="ghost" size="sm" onClick={detachTemplate} className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
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
                <Select onValueChange={assignTemplate}>
                  <SelectTrigger className="w-64 mx-auto"><SelectValue placeholder="Välj mall..." /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Post</TableHead>
                  <TableHead className="text-right w-[18%]">Budget</TableHead>
                  <TableHead className="text-right w-[18%]">Utfall</TableHead>
                  <TableHead className="text-right w-[18%]">Avvikelse</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeLines.length > 0 && renderTableSection('Intäkter', incomeLines, 'Intäkt')}
                {costLines.length > 0 && renderTableSection('Kostnader', costLines, 'Kostnad')}
                {/* Net total */}
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-t-2 border-border font-bold">
                  <TableCell className="py-2 pl-3 text-sm font-bold">Netto</TableCell>
                  <TableCell className="py-2 text-right font-mono text-sm font-bold tabular-nums">{fmt(totalBudgetIncome - totalBudgetCost)}</TableCell>
                  <TableCell className="py-2 text-right font-mono text-sm font-bold tabular-nums">{fmt(totalActualIncome - totalActualCost)}</TableCell>
                  <TableCell className={`py-2 text-right font-mono text-sm font-bold tabular-nums ${(totalActualIncome - totalActualCost) >= (totalBudgetIncome - totalBudgetCost) ? 'text-primary' : 'text-destructive'}`}>
                    {fmt((totalBudgetIncome - totalBudgetCost) - (totalActualIncome - totalActualCost))}
                  </TableCell>
                  <TableCell className="w-8"></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {/* Delete line confirmation */}
        <AlertDialog open={!!deleteLineConfirm} onOpenChange={() => setDeleteLineConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ta bort post</AlertDialogTitle>
              <AlertDialogDescription>
                Är du säker på att du vill ta bort "{deleteLineConfirm?.name}"?
                {deleteLineConfirm?.hasTxs && ' Alla tillhörande transaktioner kommer också att tas bort.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteLineConfirm && removeLine(deleteLineConfirm.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Ta bort
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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

        {/* Add custom line dialog */}
        <Dialog open={showAddLineDialog} onOpenChange={setShowAddLineDialog}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Lägg till post</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Namn</label>
                <Input value={newLineName} onChange={e => setNewLineName(e.target.value)} placeholder="T.ex. Konsultkostnad" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Typ</label>
                <Select value={newLineType} onValueChange={setNewLineType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Intäkt">Intäkt</SelectItem>
                    <SelectItem value="Kostnad">Kostnad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddLineDialog(false)}>Avbryt</Button>
              <Button onClick={addCustomLine}>Lägg till</Button>
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

      {templates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {templates.map(t => (
            <div key={t.id} className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted/50 text-xs">
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span>{t.name}</span>
              <span className="text-muted-foreground">({templateItems.filter(i => i.template_id === t.id).length} poster)</span>
              <button onClick={() => openEditTemplate(t)} className="ml-1 hover:text-primary"><Pencil className="h-3 w-3" /></button>
              <button onClick={() => setDeleteTemplateConfirm({ id: t.id, name: t.name })} className="hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}

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

      {/* Delete template confirmation */}
      <AlertDialog open={!!deleteTemplateConfirm} onOpenChange={() => setDeleteTemplateConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort mall</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort mallen "{deleteTemplateConfirm?.name}"? Befintliga projektredovisningar påverkas inte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTemplateConfirm && deleteTemplate(deleteTemplateConfirm.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete template item confirmation */}
      <AlertDialog open={deleteTemplateItemConfirm !== null} onOpenChange={() => setDeleteTemplateItemConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort post från mall</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort denna post? Befintliga projektredovisningar påverkas inte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deleteTemplateItemConfirm !== null) {
                setEditTemplateItems(editTemplateItems.filter((_, i) => i !== deleteTemplateItemConfirm));
                setDeleteTemplateItemConfirm(null);
              }
            }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveTemplateItem(idx, -1)} disabled={idx === 0} className="p-0.5 rounded hover:bg-muted disabled:opacity-20">
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button onClick={() => moveTemplateItem(idx, 1)} disabled={idx === editTemplateItems.length - 1} className="p-0.5 rounded hover:bg-muted disabled:opacity-20">
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
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
                    <button onClick={() => confirmRemoveTemplateItem(idx)} className="p-1 hover:text-destructive">
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
