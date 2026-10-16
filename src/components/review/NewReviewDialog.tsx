import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { FolderPlus, Link2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projects: { id: string; code?: string | null; name: string }[];
  onPick: (projectId: string) => void;
}

export function NewReviewDialog({ open, onOpenChange, projects, onPick }: Props) {
  const { addProject, projects: all } = useProjectDataContext();
  const { toast } = useToast();
  const [mode, setMode] = useState<'link' | 'new'>('link');
  const [pid, setPid] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('');
  const [busy, setBusy] = useState(false);

  const sorted = [...projects].sort((a, b) => (a.code ?? '').localeCompare(b.code ?? '', 'sv', { numeric: true }));

  const reset = () => { setPid(''); setCode(''); setName(''); setCustomer(''); setMode('link'); };

  const submit = async () => {
    if (mode === 'link') {
      if (!pid) return;
      onPick(pid);
    } else {
      if (!code.trim() || !name.trim()) return;
      if (all.some(p => p.code === code.trim())) {
        toast({ title: 'Projektnumret finns redan', variant: 'destructive' });
        return;
      }
      setBusy(true);
      const p = await addProject({ code: code.trim(), name: name.trim(), customer: customer.trim(), activities: [] } as any);
      setBusy(false);
      if (!p) return;
      onPick(p.id);
    }
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Skapa ny genomgång</DialogTitle>
          <DialogDescription>Koppla till ett befintligt projekt eller starta med ett helt nytt.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {([['link', 'Koppla till projekt', Link2], ['new', 'Helt nytt projekt', FolderPlus]] as const).map(([k, label, Icon]) => (
            <button key={k} type="button" onClick={() => setMode(k)}
              className={cn('flex flex-col items-center gap-1 border p-3 text-sm transition-colors', mode === k ? 'border-primary bg-primary/10 text-primary font-medium' : 'hover:bg-muted')}>
              <Icon className="h-5 w-5" />{label}
            </button>
          ))}
        </div>
        {mode === 'link' ? (
          <Select value={pid} onValueChange={setPid}>
            <SelectTrigger><SelectValue placeholder={sorted.length ? 'Välj projekt' : 'Alla projekt har redan en genomgång'} /></SelectTrigger>
            <SelectContent className="max-h-72">
              {sorted.map(p => <SelectItem key={p.id} value={p.id}>{p.code ? `${p.code} – ` : ''}{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <div className="space-y-2">
            <Input placeholder="Projektnummer" value={code} onChange={e => setCode(e.target.value)} />
            <Input placeholder="Projektnamn" value={name} onChange={e => setName(e.target.value)} />
            <Input placeholder="Kund" value={customer} onChange={e => setCustomer(e.target.value)} />
            <p className="text-xs text-muted-foreground">Projektet läggs även till i projektlistan.</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button disabled={busy || (mode === 'link' ? !pid : !code.trim() || !name.trim())} onClick={submit}>Skapa genomgång</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
