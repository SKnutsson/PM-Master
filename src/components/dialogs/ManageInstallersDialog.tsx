import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Installer } from '@/hooks/useResourceData';

interface Props {
  installers: Installer[];
  onAdd: (installer: Omit<Installer, 'id'>) => Promise<Installer | null>;
  onUpdate: (id: string, updates: Partial<Installer>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  trigger: React.ReactNode;
}

export function ManageInstallersDialog({ installers, onAdd, onUpdate, onDelete, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', company: '', phone: '', email: '' });

  const resetForm = () => { setForm({ name: '', company: '', phone: '', email: '' }); setAdding(false); setEditId(null); };

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await onAdd(form);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editId || !form.name.trim()) return;
    await onUpdate(editId, form);
    resetForm();
  };

  const startEdit = (i: Installer) => {
    setEditId(i.id);
    setForm({ name: i.name, company: i.company, phone: i.phone, email: i.email });
    setAdding(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Hantera montörer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {installers.map(inst => (
            <div key={inst.id} className="flex items-center gap-2 p-2 rounded bg-muted/30 border border-border/30">
              {editId === inst.id ? (
                <div className="flex-1 space-y-2">
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Namn" className="h-8 text-xs" />
                  <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Företag" className="h-8 text-xs" />
                  <div className="flex gap-2">
                    <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Telefon" className="h-8 text-xs" />
                    <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="E-post" className="h-8 text-xs" />
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7 text-xs" onClick={handleUpdate}><Check className="h-3 w-3 mr-1" />Spara</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={resetForm}><X className="h-3 w-3 mr-1" />Avbryt</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{inst.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{inst.company}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(inst)}><Edit2 className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => onDelete(inst.id)}><Trash2 className="h-3 w-3" /></Button>
                </>
              )}
            </div>
          ))}
        </div>

        {adding ? (
          <div className="space-y-2 border-t border-border/30 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Namn *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">Företag</Label><Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">Telefon</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">E-post</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-8 text-xs" /></div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" className="h-7 text-xs" onClick={handleAdd}><Check className="h-3 w-3 mr-1" />Lägg till</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={resetForm}><X className="h-3 w-3 mr-1" />Avbryt</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => { setAdding(true); setEditId(null); setForm({ name: '', company: '', phone: '', email: '' }); }}>
            <Plus className="h-3 w-3 mr-1" />Lägg till montör
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
