import { useState } from 'react';
import { useLifecycleData, LifecycleNode } from '@/hooks/useLifecycleData';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Pencil, X, Check, LayoutDashboard, BarChart3, FolderKanban, CalendarDays, HardHat, ClipboardList, ListChecks } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const tools = [
  { icon: LayoutDashboard, name: 'Dashboard', desc: 'Översikt av alla aktiva projekt och faser' },
  { icon: BarChart3, name: 'Prognos', desc: 'Försäljningsprognos och pipeline-hantering' },
  { icon: FolderKanban, name: 'Projekt', desc: 'Hantera projektdetaljer, ansvariga och status' },
  { icon: ListChecks, name: 'Mina uppgifter', desc: 'Personliga aktiviteter och att-göra' },
  { icon: CalendarDays, name: 'Ganttschema', desc: 'Visuell tidsplanering med milstolpar' },
  { icon: HardHat, name: 'Resursplanering', desc: 'Montörtilldelning och kapacitetsanalys' },
  { icon: ClipboardList, name: 'Dokumentationsplan', desc: 'Spåra leverabler och styrdokument' },
];

export function AboutView() {
  const { nodes, isLoading, addNode, updateNode, deleteNode, addItem, updateItem, deleteItem } = useLifecycleData();
  const [addNodeDialog, setAddNodeDialog] = useState<{ open: boolean; afterSort: number }>({ open: false, afterSort: 0 });
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<'phase' | 'milestone'>('milestone');
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeName, setEditingNodeName] = useState('');
  const [addingItemNodeId, setAddingItemNodeId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');

  const sortedNodes = [...nodes].sort((a, b) => a.sort_order - b.sort_order);
  const phases = nodes.filter(n => n.node_type === 'phase');
  const milestones = nodes.filter(n => n.node_type === 'milestone');

  const handleAddNode = async () => {
    if (!newNodeName.trim()) return;
    await addNode(newNodeName.trim(), newNodeType, addNodeDialog.afterSort);
    setAddNodeDialog({ open: false, afterSort: 0 });
    setNewNodeName('');
  };

  const handleSaveNodeName = async (id: string) => {
    if (editingNodeName.trim()) await updateNode(id, editingNodeName.trim());
    setEditingNodeId(null);
  };

  const handleAddItem = async (nodeId: string) => {
    if (!newItemText.trim()) return;
    await addItem(nodeId, newItemText.trim());
    setNewItemText('');
    setAddingItemNodeId(null);
  };

  const handleSaveItem = async (itemId: string) => {
    if (editingItemText.trim()) await updateItem(itemId, editingItemText.trim());
    setEditingItemId(null);
  };

  return (
    <div className="p-6 space-y-10 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Om PM Master</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl leading-relaxed">
          PM Master är ett projekthanteringssystem utvecklat för Alfing Seating.
          Systemet ger full överblick över projektens livscykel – från förstudie till avslut –
          med verktyg för planering, prognos, resurshantering och dokumentation.
        </p>
      </div>

      {/* Tools grid */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Verktyg</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {tools.map((t) => (
            <div key={t.name} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
                <t.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground leading-snug">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lifecycle */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Projektcykel</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Laddar...</p>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex items-start gap-0 min-w-max">
              {sortedNodes.map((node, idx) => (
                <div key={node.id} className="flex items-start shrink-0">
                  {node.node_type === 'phase' ? (
                    <PhaseNode
                      node={node}
                      index={phases.indexOf(node) + 1}
                      editingNodeId={editingNodeId}
                      editingNodeName={editingNodeName}
                      onStartEdit={(id, name) => { setEditingNodeId(id); setEditingNodeName(name); }}
                      onSaveEdit={handleSaveNodeName}
                      onCancelEdit={() => setEditingNodeId(null)}
                      onDelete={deleteNode}
                      onNodeNameChange={setEditingNodeName}
                      addingItemNodeId={addingItemNodeId}
                      onStartAddItem={setAddingItemNodeId}
                      newItemText={newItemText}
                      onNewItemTextChange={setNewItemText}
                      onAddItem={handleAddItem}
                      onCancelAddItem={() => { setAddingItemNodeId(null); setNewItemText(''); }}
                      editingItemId={editingItemId}
                      editingItemText={editingItemText}
                      onStartEditItem={(id, text) => { setEditingItemId(id); setEditingItemText(text); }}
                      onSaveEditItem={handleSaveItem}
                      onCancelEditItem={() => setEditingItemId(null)}
                      onDeleteItem={deleteItem}
                      onEditItemTextChange={setEditingItemText}
                    />
                  ) : (
                    <MilestoneNode
                      node={node}
                      index={milestones.indexOf(node) + 1}
                      editingNodeId={editingNodeId}
                      editingNodeName={editingNodeName}
                      onStartEdit={(id, name) => { setEditingNodeId(id); setEditingNodeName(name); }}
                      onSaveEdit={handleSaveNodeName}
                      onCancelEdit={() => setEditingNodeId(null)}
                      onDelete={deleteNode}
                      onDelete={deleteNode}
                      onNodeNameChange={setEditingNodeName}
                      addingItemNodeId={addingItemNodeId}
                      onStartAddItem={setAddingItemNodeId}
                      newItemText={newItemText}
                      onNewItemTextChange={setNewItemText}
                      onAddItem={handleAddItem}
                      onCancelAddItem={() => { setAddingItemNodeId(null); setNewItemText(''); }}
                      editingItemId={editingItemId}
                      editingItemText={editingItemText}
                      onStartEditItem={(id, text) => { setEditingItemId(id); setEditingItemText(text); }}
                      onSaveEditItem={handleSaveItem}
                      onCancelEditItem={() => setEditingItemId(null)}
                      onDeleteItem={deleteItem}
                      onEditItemTextChange={setEditingItemText}
                    />
                  )}
                  {idx < sortedNodes.length - 1 && (
                    <div className="flex items-center justify-center pt-4 mx-0.5 shrink-0">
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setAddNodeDialog({ open: true, afterSort: node.sort_order })}
                            className="group flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/10 transition-colors"
                          >
                            <Plus className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Lägg till fas eller beslutspunkt</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex items-center pt-4 ml-1 shrink-0">
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setAddNodeDialog({ open: true, afterSort: sortedNodes.length > 0 ? sortedNodes[sortedNodes.length - 1].sort_order : 0 })}
                      className="group flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/10 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Lägg till i slutet</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add node dialog */}
      <Dialog open={addNodeDialog.open} onOpenChange={(o) => setAddNodeDialog({ ...addNodeDialog, open: o })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Lägg till</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Typ</label>
              <Select value={newNodeType} onValueChange={(v) => setNewNodeType(v as 'phase' | 'milestone')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="phase">Fas</SelectItem>
                  <SelectItem value="milestone">Beslutspunkt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Namn</label>
              <Input value={newNodeName} onChange={(e) => setNewNodeName(e.target.value)} placeholder={newNodeType === 'phase' ? 'T.ex. Produktion' : 'T.ex. Klar för montage'} onKeyDown={(e) => e.key === 'Enter' && handleAddNode()} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNodeDialog({ ...addNodeDialog, open: false })}>Avbryt</Button>
            <Button onClick={handleAddNode} disabled={!newNodeName.trim()}>Lägg till</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Shared props ─── */
interface NodeProps {
  node: LifecycleNode;
  index: number;
  editingNodeId: string | null;
  editingNodeName: string;
  onStartEdit: (id: string, name: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onNodeNameChange: (name: string) => void;
  addingItemNodeId: string | null;
  onStartAddItem: (id: string) => void;
  newItemText: string;
  onNewItemTextChange: (text: string) => void;
  onAddItem: (nodeId: string) => void;
  onCancelAddItem: () => void;
  editingItemId: string | null;
  editingItemText: string;
  onStartEditItem: (id: string, text: string) => void;
  onSaveEditItem: (id: string) => void;
  onCancelEditItem: () => void;
  onDeleteItem: (id: string) => void;
  onEditItemTextChange: (text: string) => void;
}

/* ─── Phase ─── */
function PhaseNode({ node, index, editingNodeId, editingNodeName, onStartEdit, onSaveEdit, onCancelEdit, onDelete, onNodeNameChange, addingItemNodeId, onStartAddItem, newItemText, onNewItemTextChange, onAddItem, onCancelAddItem, editingItemId, editingItemText, onStartEditItem, onSaveEditItem, onCancelEditItem, onDeleteItem, onEditItemTextChange }: NodeProps) {
  const isEditing = editingNodeId === node.id;

  return (
    <div className="flex flex-col items-center w-36 shrink-0">
      <div className="relative w-full group">
        <div className="bg-primary text-primary-foreground px-3 py-2 clip-phase flex items-center justify-center min-h-[40px]">
          <span className="font-bold text-sm">F{index}</span>
        </div>
        <div className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 z-10">
          <button onClick={() => onStartEdit(node.id, node.name)} className="p-0.5 rounded-full bg-card border shadow-sm hover:bg-accent"><Pencil className="h-2.5 w-2.5" /></button>
          <button onClick={() => onDelete(node.id)} className="p-0.5 rounded-full bg-card border shadow-sm hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-2.5 w-2.5" /></button>
        </div>
      </div>
      <div className="mt-1.5 text-center px-1">
        {isEditing ? (
          <div className="flex items-center gap-0.5">
            <Input value={editingNodeName} onChange={(e) => onEditItemTextChange(e.target.value)} className="h-6 text-[10px]" onKeyDown={(e) => { if (e.key === 'Enter') onSaveEdit(node.id); }} autoFocus />
            <button onClick={() => onSaveEdit(node.id)} className="text-primary"><Check className="h-3 w-3" /></button>
            <button onClick={onCancelEdit} className="text-muted-foreground"><X className="h-3 w-3" /></button>
          </div>
        ) : (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground leading-tight">{node.name}</p>
        )}
      </div>
      <ItemsList node={node} addingItemNodeId={addingItemNodeId} onStartAddItem={onStartAddItem} newItemText={newItemText} onNewItemTextChange={onNewItemTextChange} onAddItem={onAddItem} onCancelAddItem={onCancelAddItem} editingItemId={editingItemId} editingItemText={editingItemText} onStartEditItem={onStartEditItem} onSaveEditItem={onSaveEditItem} onCancelEditItem={onCancelEditItem} onDeleteItem={onDeleteItem} onEditItemTextChange={onEditItemTextChange} />
    </div>
  );
}

/* ─── Milestone ─── */
function MilestoneNode({ node, index, editingNodeId, editingNodeName, onStartEdit, onSaveEdit, onCancelEdit, onDelete, addingItemNodeId, onStartAddItem, newItemText, onNewItemTextChange, onAddItem, onCancelAddItem, editingItemId, editingItemText, onStartEditItem, onSaveEditItem, onCancelEditItem, onDeleteItem, onEditItemTextChange }: NodeProps) {
  const isEditing = editingNodeId === node.id;

  return (
    <div className="flex flex-col items-center w-28 shrink-0">
      <div className="relative group">
        <div className="w-10 h-10 bg-accent-foreground rotate-45 flex items-center justify-center">
          <span className="font-bold text-[11px] text-primary-foreground -rotate-45">M{index}</span>
        </div>
        <div className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 z-10">
          <button onClick={() => onStartEdit(node.id, node.name)} className="p-0.5 rounded-full bg-card border shadow-sm hover:bg-accent"><Pencil className="h-2.5 w-2.5" /></button>
          <button onClick={() => onDelete(node.id)} className="p-0.5 rounded-full bg-card border shadow-sm hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-2.5 w-2.5" /></button>
        </div>
      </div>
      <div className="mt-1.5 text-center px-1">
        {isEditing ? (
          <div className="flex items-center gap-0.5">
            <Input value={editingNodeName} onChange={(e) => onEditItemTextChange(e.target.value)} className="h-6 text-[10px]" onKeyDown={(e) => { if (e.key === 'Enter') onSaveEdit(node.id); }} autoFocus />
            <button onClick={() => onSaveEdit(node.id)} className="text-primary"><Check className="h-3 w-3" /></button>
            <button onClick={onCancelEdit} className="text-muted-foreground"><X className="h-3 w-3" /></button>
          </div>
        ) : (
          <p className="text-[10px] font-medium text-foreground leading-tight">{node.name}</p>
        )}
      </div>
      <ItemsList node={node} addingItemNodeId={addingItemNodeId} onStartAddItem={onStartAddItem} newItemText={newItemText} onNewItemTextChange={onNewItemTextChange} onAddItem={onAddItem} onCancelAddItem={onCancelAddItem} editingItemId={editingItemId} editingItemText={editingItemText} onStartEditItem={onStartEditItem} onSaveEditItem={onSaveEditItem} onCancelEditItem={onCancelEditItem} onDeleteItem={onDeleteItem} onEditItemTextChange={onEditItemTextChange} />
    </div>
  );
}

/* ─── Items list (shared) ─── */
function ItemsList({ node, addingItemNodeId, onStartAddItem, newItemText, onNewItemTextChange, onAddItem, onCancelAddItem, editingItemId, editingItemText, onStartEditItem, onSaveEditItem, onCancelEditItem, onDeleteItem, onEditItemTextChange }: Omit<NodeProps, 'index' | 'editingNodeId' | 'editingNodeName' | 'onStartEdit' | 'onSaveEdit' | 'onCancelEdit' | 'onDelete'>) {
  return (
    <div className="mt-2 w-full space-y-0.5">
      {node.items.map((item) => (
        <div key={item.id} className="group/item flex items-start gap-0.5 text-[10px] text-muted-foreground px-1 leading-snug">
          {editingItemId === item.id ? (
            <div className="flex items-center gap-0.5 w-full">
              <Input value={editingItemText} onChange={(e) => onEditItemTextChange(e.target.value)} className="h-5 text-[10px] flex-1" onKeyDown={(e) => e.key === 'Enter' && onSaveEditItem(item.id)} autoFocus />
              <button onClick={() => onSaveEditItem(item.id)} className="text-primary shrink-0"><Check className="h-2.5 w-2.5" /></button>
              <button onClick={onCancelEditItem} className="text-muted-foreground shrink-0"><X className="h-2.5 w-2.5" /></button>
            </div>
          ) : (
            <>
              <span className="flex-1">{item.text}</span>
              <div className="opacity-0 group-hover/item:opacity-100 flex gap-0.5 shrink-0">
                <button onClick={() => onStartEditItem(item.id, item.text)} className="hover:text-primary"><Pencil className="h-2.5 w-2.5" /></button>
                <button onClick={() => onDeleteItem(item.id)} className="hover:text-destructive"><Trash2 className="h-2.5 w-2.5" /></button>
              </div>
            </>
          )}
        </div>
      ))}
      {addingItemNodeId === node.id ? (
        <div className="flex items-center gap-0.5 px-1">
          <Input value={newItemText} onChange={(e) => onNewItemTextChange(e.target.value)} className="h-5 text-[10px] flex-1" placeholder="Ny punkt..." onKeyDown={(e) => e.key === 'Enter' && onAddItem(node.id)} autoFocus />
          <button onClick={() => onAddItem(node.id)} className="text-primary shrink-0"><Check className="h-2.5 w-2.5" /></button>
          <button onClick={onCancelAddItem} className="text-muted-foreground shrink-0"><X className="h-2.5 w-2.5" /></button>
        </div>
      ) : (
        <button onClick={() => onStartAddItem(node.id)} className="flex items-center gap-0.5 text-[10px] text-muted-foreground/40 hover:text-primary px-1 transition-colors">
          <Plus className="h-2.5 w-2.5" /> Lägg till
        </button>
      )}
    </div>
  );
}
