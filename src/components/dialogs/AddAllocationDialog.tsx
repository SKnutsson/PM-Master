import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Installer } from '@/hooks/useResourceData';

interface Props {
  projectId: string;
  installers: Installer[];
  onAdd: (alloc: { projectId: string; installerId: string; startDate: string; endDate: string; plannedHours: number }) => Promise<any>;
  trigger: React.ReactNode;
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}

export function AddAllocationDialog({ projectId, installers, onAdd, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [installerId, setInstallerId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [plannedHours, setPlannedHours] = useState('');

  const days = startDate && endDate ? daysBetween(startDate, endDate) : 0;

  const handleSubmit = async () => {
    if (!installerId || !startDate || !endDate) return;
    await onAdd({
      projectId, installerId,
      startDate, endDate,
      plannedHours: parseFloat(plannedHours) || 0,
    });
    setOpen(false);
    setInstallerId(''); setStartDate(''); setEndDate(''); setPlannedHours('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Lägg till montageperiod</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Montör *</Label>
            <Select value={installerId} onValueChange={setInstallerId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Välj montör" /></SelectTrigger>
              <SelectContent>
                {installers.map(i => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name} ({i.company})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Från *</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Till *</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 text-xs" /></div>
          </div>
          {days > 0 && <p className="text-[10px] text-muted-foreground">Antal dagar: {days}</p>}
          <div>
            <Label className="text-xs">Planerad arbetstid (timmar)</Label>
            <Input type="number" value={plannedHours} onChange={e => setPlannedHours(e.target.value)} className="h-8 text-xs" placeholder="0" />
          </div>
          <Button className="w-full h-8 text-xs" onClick={handleSubmit} disabled={!installerId || !startDate || !endDate}>
            Lägg till
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
