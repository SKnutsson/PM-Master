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
  preselectedProjectInstallerId?: string;
  projectInstallers: ProjectInstaller[];
  existingEntries: DailyResourceEntry[];
  onSave: (projectInstallerId: string, installerId: string | null, workHours: number, travelHours: number) => Promise<void>;
}

export function DailyEntryDialog({ open, onOpenChange, projectId, date, preselectedProjectInstallerId, projectInstallers, existingEntries, onSave }: Props) {
  const [selectedPiId, setSelectedPiId] = useState('');
  const [workHours, setWorkHours] = useState('');
  const [travelHours, setTravelHours] = useState('');

  // Pre-fill when selecting an installer that has existing entry
  useEffect(() => {
    if (selectedPiId) {
      const existing = existingEntries.find(e => e.projectInstallerId === selectedPiId && e.date === date);
      if (existing) {
        setWorkHours(String(existing.plannedWorkHours));
        setTravelHours(String(existing.plannedTravelHours));
      } else {
        setWorkHours('8');
        setTravelHours('0');
      }
    }
  }, [selectedPiId, date, existingEntries]);

  useEffect(() => {
    if (open) {
      setSelectedPiId(preselectedProjectInstallerId || '');
      setWorkHours('');
      setTravelHours('');
    }
  }, [open, preselectedProjectInstallerId]);

  const formattedDate = date ? new Date(date + 'T00:00:00').toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' }) : '';

  const handleSave = async () => {
    if (!selectedPiId) return;
    const pi = projectInstallers.find(p => p.id === selectedPiId);
    if (!pi) return;
    await onSave(selectedPiId, pi.installerId || null, parseFloat(workHours) || 0, parseFloat(travelHours) || 0);
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
            <Select value={selectedPiId} onValueChange={setSelectedPiId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Välj montör" /></SelectTrigger>
              <SelectContent>
                {projectInstallers.map(pi => (
                  <SelectItem key={pi.id} value={pi.id} className="text-xs">
                    {pi.isVacant ? 'Vakant' : `${pi.installerName} (${pi.installerCompany})`}
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
                  {e.installerName || 'Vakant'}: {e.plannedWorkHours}h arbete + {e.plannedTravelHours}h resa
                </div>
              ))}
            </div>
          )}
          <Button className="w-full h-8 text-xs" onClick={handleSave} disabled={!selectedPiId}>
            Spara
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}