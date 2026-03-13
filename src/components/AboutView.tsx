import { useState } from 'react';
import { useLifecycleData, LifecycleNode } from '@/hooks/useLifecycleData';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Pencil, X, Check, Diamond, ArrowRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Laddar...</p></div>;
  }

  const phases = nodes.filter(n => n.node_type === 'phase');
  const milestones = nodes.filter(n => n.node_type === 'milestone');

  const handleAddNode = async () => {
    if (!newNodeName.trim()) return;
    await addNode(newNodeName.trim(), newNodeType, addNodeDialog.afterSort);
    setAddNodeDialog({ open: false, afterSort: 0 });
    setNewNodeName('');
  };

  const handleSaveNodeName = async (id: string) => {
    if (editingNodeName.trim()) {
      await updateNode(id, editingNodeName.trim());
    }
    setEditingNodeId(null);
  };

  const handleAddItem = async (nodeId: string) => {
    if (!newItemText.trim()) return;
    await addItem(nodeId, newItemText.trim());
    setNewItemText('');
    setAddingItemNodeId(null);
  };

  const handleSaveItem = async (itemId: string) => {
    if (editingItemText.trim()) {
      await updateItem(itemId, editingItemText.trim());
    }
    setEditingItemId(null);
  };

  // Build a visual flow: interleave phases and milestones by sort_order
  const sortedNodes = [...nodes].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="p-6 space-y-8 max-w-full overflow-x-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Projektets livscykel</h1>
        <p className="text-muted-foreground mt-1">Faser, beslutspunkter och tillhörande aktiviteter</p>
      </div>

      {/* Timeline visualization */}
      <div className="relative">
        {/* Flow diagram */}
        <div className="flex items-start gap-0 overflow-x-auto pb-8">
          {sortedNodes.map((node, idx) => (
            <div key={node.id} className="flex items-start shrink-0">
              {/* Node */}
              {node.node_type === 'phase' ? (
                <PhaseCard
                  node={node}
                  phaseIndex={phases.indexOf(node) + 1}
                  editingNodeId={editingNodeId}
                  editingNodeName={editingNodeName}
                  setEditingNodeId={setEditingNodeId}
                  setEditingNodeName={setEditingNodeName}
                  handleSaveNodeName={handleSaveNodeName}
                  deleteNode={deleteNode}
                  addingItemNodeId={addingItemNodeId}
                  setAddingItemNodeId={setAddingItemNodeId}
                  newItemText={newItemText}
                  setNewItemText={setNewItemText}
                  handleAddItem={handleAddItem}
                  editingItemId={editingItemId}
                  editingItemText={editingItemText}
                  setEditingItemId={setEditingItemId}
                  setEditingItemText={setEditingItemText}
                  handleSaveItem={handleSaveItem}
                  deleteItem={deleteItem}
                />
              ) : (
                <MilestoneCard
                  node={node}
                  milestoneIndex={milestones.indexOf(node) + 1}
                  editingNodeId={editingNodeId}
                  editingNodeName={editingNodeName}
                  setEditingNodeId={setEditingNodeId}
                  setEditingNodeName={setEditingNodeName}
                  handleSaveNodeName={handleSaveNodeName}
                  deleteNode={deleteNode}
                  addingItemNodeId={addingItemNodeId}
                  setAddingItemNodeId={setAddingItemNodeId}
                  newItemText={newItemText}
                  setNewItemText={setNewItemText}
                  handleAddItem={handleAddItem}
                  editingItemId={editingItemId}
                  editingItemText={editingItemText}
                  setEditingItemId={setEditingItemId}
                  setEditingItemText={setEditingItemText}
                  handleSaveItem={handleSaveItem}
                  deleteItem={deleteItem}
                />
              )}

              {/* Arrow / Add button between nodes */}
              {idx < sortedNodes.length - 1 && (
                <div className="flex flex-col items-center justify-start pt-6 mx-1 shrink-0">
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setAddNodeDialog({ open: true, afterSort: node.sort_order })}
                        className="group flex items-center justify-center w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/10 transition-colors"
                      >
                        <Plus className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Lägg till fas eller beslutspunkt</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          ))}

          {/* Add at end */}
          <div className="flex flex-col items-center justify-start pt-6 mx-2 shrink-0">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setAddNodeDialog({ open: true, afterSort: sortedNodes.length > 0 ? sortedNodes[sortedNodes.length - 1].sort_order : 0 })}
                  className="group flex items-center justify-center w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/10 transition-colors"
                >
                  <Plus className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Lägg till i slutet</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Add node dialog */}
      <Dialog open={addNodeDialog.open} onOpenChange={(o) => setAddNodeDialog({ ...addNodeDialog, open: o })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lägg till</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Typ</label>
              <Select value={newNodeType} onValueChange={(v) => setNewNodeType(v as 'phase' | 'milestone')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="phase">Fas</SelectItem>
                  <SelectItem value="milestone">Beslutspunkt / Milstolpe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Namn</label>
              <Input
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                placeholder={newNodeType === 'phase' ? 'T.ex. Produktion' : 'T.ex. Klar för montage'}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNode()}
              />
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

/* ─── Phase card ─── */
interface CardProps {
  node: LifecycleNode;
  phaseIndex?: number;
  milestoneIndex?: number;
  editingNodeId: string | null;
  editingNodeName: string;
  setEditingNodeId: (id: string | null) => void;
  setEditingNodeName: (name: string) => void;
  handleSaveNodeName: (id: string) => void;
  deleteNode: (id: string) => void;
  addingItemNodeId: string | null;
  setAddingItemNodeId: (id: string | null) => void;
  newItemText: string;
  setNewItemText: (text: string) => void;
  handleAddItem: (nodeId: string) => void;
  editingItemId: string | null;
  editingItemText: string;
  setEditingItemId: (id: string | null) => void;
  setEditingItemText: (text: string) => void;
  handleSaveItem: (itemId: string) => void;
  deleteItem: (itemId: string) => void;
}

function PhaseCard({ node, phaseIndex, editingNodeId, editingNodeName, setEditingNodeId, setEditingNodeName, handleSaveNodeName, deleteNode, addingItemNodeId, setAddingItemNodeId, newItemText, setNewItemText, handleAddItem, editingItemId, editingItemText, setEditingItemId, setEditingItemText, handleSaveItem, deleteItem }: CardProps) {
  const isEditing = editingNodeId === node.id;

  return (
    <div className="flex flex-col items-center w-44 shrink-0">
      {/* Phase arrow shape */}
      <div className="relative w-full group">
        <div className="bg-[hsl(var(--primary))] text-primary-foreground px-4 py-3 clip-phase flex items-center justify-center min-h-[52px]">
          <span className="font-bold text-lg mr-1">F{phaseIndex}</span>
        </div>
        {/* Edit/delete buttons */}
        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button onClick={() => { setEditingNodeId(node.id); setEditingNodeName(node.name); }} className="p-1 rounded-full bg-card border shadow-sm hover:bg-accent"><Pencil className="h-3 w-3" /></button>
          <button onClick={() => deleteNode(node.id)} className="p-1 rounded-full bg-card border shadow-sm hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>

      {/* Phase name */}
      <div className="mt-2 text-center">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input value={editingNodeName} onChange={(e) => setEditingNodeName(e.target.value)} className="h-7 text-xs" onKeyDown={(e) => e.key === 'Enter' && handleSaveNodeName(node.id)} autoFocus />
            <button onClick={() => handleSaveNodeName(node.id)} className="text-primary"><Check className="h-4 w-4" /></button>
            <button onClick={() => setEditingNodeId(null)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground">{node.name}</p>
        )}
      </div>

      {/* Items */}
      <div className="mt-3 w-full space-y-1">
        {node.items.map((item) => (
          <div key={item.id} className="group/item flex items-start gap-1 text-xs text-muted-foreground px-1">
            {editingItemId === item.id ? (
              <div className="flex items-center gap-1 w-full">
                <Input value={editingItemText} onChange={(e) => setEditingItemText(e.target.value)} className="h-6 text-xs flex-1" onKeyDown={(e) => e.key === 'Enter' && handleSaveItem(item.id)} autoFocus />
                <button onClick={() => handleSaveItem(item.id)} className="text-primary shrink-0"><Check className="h-3 w-3" /></button>
                <button onClick={() => setEditingItemId(null)} className="text-muted-foreground shrink-0"><X className="h-3 w-3" /></button>
              </div>
            ) : (
              <>
                <span className="leading-snug flex-1">{item.text}</span>
                <div className="opacity-0 group-hover/item:opacity-100 flex gap-0.5 shrink-0">
                  <button onClick={() => { setEditingItemId(item.id); setEditingItemText(item.text); }} className="hover:text-primary"><Pencil className="h-3 w-3" /></button>
                  <button onClick={() => deleteItem(item.id)} className="hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Add item */}
        {addingItemNodeId === node.id ? (
          <div className="flex items-center gap-1 px-1">
            <Input value={newItemText} onChange={(e) => setNewItemText(e.target.value)} className="h-6 text-xs flex-1" placeholder="Ny punkt..." onKeyDown={(e) => e.key === 'Enter' && handleAddItem(node.id)} autoFocus />
            <button onClick={() => handleAddItem(node.id)} className="text-primary shrink-0"><Check className="h-3 w-3" /></button>
            <button onClick={() => { setAddingItemNodeId(null); setNewItemText(''); }} className="text-muted-foreground shrink-0"><X className="h-3 w-3" /></button>
          </div>
        ) : (
          <button onClick={() => setAddingItemNodeId(node.id)} className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-primary px-1 transition-colors">
            <Plus className="h-3 w-3" /> Lägg till
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Milestone card ─── */
function MilestoneCard({ node, milestoneIndex, editingNodeId, editingNodeName, setEditingNodeId, setEditingNodeName, handleSaveNodeName, deleteNode, addingItemNodeId, setAddingItemNodeId, newItemText, setNewItemText, handleAddItem, editingItemId, editingItemText, setEditingItemId, setEditingItemText, handleSaveItem, deleteItem }: CardProps) {
  const isEditing = editingNodeId === node.id;

  return (
    <div className="flex flex-col items-center w-32 shrink-0">
      {/* Diamond shape */}
      <div className="relative group">
        <div className="w-14 h-14 bg-amber-500 rotate-45 flex items-center justify-center shadow-md">
          <span className="font-bold text-sm text-white -rotate-45">M{milestoneIndex}</span>
        </div>
        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
          <button onClick={() => { setEditingNodeId(node.id); setEditingNodeName(node.name); }} className="p-1 rounded-full bg-card border shadow-sm hover:bg-accent"><Pencil className="h-3 w-3" /></button>
          <button onClick={() => deleteNode(node.id)} className="p-1 rounded-full bg-card border shadow-sm hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>

      {/* Name */}
      <div className="mt-2 text-center">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input value={editingNodeName} onChange={(e) => setEditingNodeName(e.target.value)} className="h-7 text-xs" onKeyDown={(e) => e.key === 'Enter' && handleSaveNodeName(node.id)} autoFocus />
            <button onClick={() => handleSaveNodeName(node.id)} className="text-primary"><Check className="h-4 w-4" /></button>
            <button onClick={() => setEditingNodeId(null)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <p className="text-[11px] font-medium text-foreground leading-tight">{node.name}</p>
        )}
      </div>

      {/* Items (milestones can have items too - e.g. governance docs) */}
      {(node.items.length > 0 || addingItemNodeId === node.id) && (
        <div className="mt-2 w-full space-y-1">
          {node.items.map((item) => (
            <div key={item.id} className="group/item flex items-start gap-1 text-xs text-muted-foreground px-1">
              {editingItemId === item.id ? (
                <div className="flex items-center gap-1 w-full">
                  <Input value={editingItemText} onChange={(e) => setEditingItemText(e.target.value)} className="h-6 text-xs flex-1" onKeyDown={(e) => e.key === 'Enter' && handleSaveItem(item.id)} autoFocus />
                  <button onClick={() => handleSaveItem(item.id)} className="text-primary shrink-0"><Check className="h-3 w-3" /></button>
                  <button onClick={() => setEditingItemId(null)} className="text-muted-foreground shrink-0"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <>
                  <span className="leading-snug flex-1">{item.text}</span>
                  <div className="opacity-0 group-hover/item:opacity-100 flex gap-0.5 shrink-0">
                    <button onClick={() => { setEditingItemId(item.id); setEditingItemText(item.text); }}><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => deleteItem(item.id)} className="hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add item button for milestones */}
      <div className="mt-1 w-full px-1">
        {addingItemNodeId === node.id ? (
          <div className="flex items-center gap-1">
            <Input value={newItemText} onChange={(e) => setNewItemText(e.target.value)} className="h-6 text-xs flex-1" placeholder="Ny punkt..." onKeyDown={(e) => e.key === 'Enter' && handleAddItem(node.id)} autoFocus />
            <button onClick={() => handleAddItem(node.id)} className="text-primary shrink-0"><Check className="h-3 w-3" /></button>
            <button onClick={() => { setAddingItemNodeId(null); setNewItemText(''); }} className="text-muted-foreground shrink-0"><X className="h-3 w-3" /></button>
          </div>
        ) : (
          <button onClick={() => setAddingItemNodeId(node.id)} className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-primary transition-colors">
            <Plus className="h-3 w-3" /> Lägg till
          </button>
        )}
      </div>
    </div>
  );
}
