import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectInstaller, DailyResourceEntry } from '@/hooks/useResourceData';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  date: string;
  preselectedInstallerId?: string;
  projectInstallers: ProjectInstaller[];
  existingEntries: DailyResourceEntry[];
  onSave: (installerId: string, workHours: number, travelHours: number) => Promise<void>;
}

export function DailyEntryDialog({ open, onOpenChange, projectId, date, preselectedInstallerId, projectInstallers, existingEntries, onSave }: Props) {
  const [installerId, setInstallerId] = useState('');
  const [workHours, setWorkHours] = useState('');
  const [travelHours, setTravelHours] = useState('');

  // Pre-fill when selecting an installer that has existing entry
  useEffect(() => {
    if (installerId) {
      const existing = existingEntries.find(e => e.installerId === installerId && e.date === date);
      if (existing) {
        setWorkHours(String(existing.plannedWorkHours));
        setTravelHours(String(existing.plannedTravelHours));
      } else {
        setWorkHours('8');
        setTravelHours('0');
      }
    }
  }, [installerId, date, existingEntries]);

  useEffect(() => {
    if (open) {
      setInstallerId(preselectedInstallerId || '');
      setWorkHours('');
      setTravelHours('');
    }
  }, [open, preselectedInstallerId]);

  const formattedDate = date ? new Date(date + 'T00:00:00').toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' }) : '';

  const handleSave = async () => {
    if (!installerId) return;
    await onSave(installerId, parseFloat(workHours) || 0, parseFloat(travelHours) || 0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-sm">Planera – {formattedDate}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Montör *</Label>
            <Select value={installerId} onValueChange={setInstallerId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Välj montör" /></SelectTrigger>
              <SelectContent>
                {projectInstallers.map(pi => (
                  <SelectItem key={pi.installerId} value={pi.installerId} className="text-xs">
                    {pi.installerName} ({pi.installerCompany})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Arbetstid (h)</Label>
              <Input type="number" value={workHours} onChange={e => setWorkHours(e.target.value)} className="h-8 text-xs" placeholder="8" min="0" step="0.5" />
            </div>
            <div>
              <Label className="text-xs">Restid (h)</Label>
              <Input type="number" value={travelHours} onChange={e => setTravelHours(e.target.value)} className="h-8 text-xs" placeholder="0" min="0" step="0.5" />
            </div>
          </div>
          {existingEntries.filter(e => e.date === date).length > 0 && (
            <div className="border-t border-border/30 pt-2">
              <p className="text-[10px] text-muted-foreground mb-1">Befintliga poster denna dag:</p>
              {existingEntries.filter(e => e.date === date).map(e => (
                <div key={e.id} className="text-[10px] text-muted-foreground">
                  {e.installerName}: {e.plannedWorkHours}h arbete + {e.plannedTravelHours}h resa
                </div>
              ))}
            </div>
          )}
          <Button className="w-full h-8 text-xs" onClick={handleSave} disabled={!installerId}>
            Spara
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
