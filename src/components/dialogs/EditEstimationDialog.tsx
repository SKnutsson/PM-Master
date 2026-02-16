import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EditEstimationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  estimatedInstallHours: number;
  estimatedTravelHours: number;
  onSave: (installHours: number, travelHours: number) => void;
}

export function EditEstimationDialog({
  open, onOpenChange, projectName,
  estimatedInstallHours, estimatedTravelHours, onSave,
}: EditEstimationDialogProps) {
  const [installHours, setInstallHours] = useState(estimatedInstallHours);
  const [travelHours, setTravelHours] = useState(estimatedTravelHours);

  useEffect(() => {
    if (open) {
      setInstallHours(estimatedInstallHours);
      setTravelHours(estimatedTravelHours);
    }
  }, [open, estimatedInstallHours, estimatedTravelHours]);

  const handleSave = () => {
    onSave(installHours, travelHours);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="text-sm">Kalkyl – {projectName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Kalkylerade arbetstimmar (montage)</Label>
            <Input
              type="number" min={0} step={1}
              value={installHours}
              onChange={e => setInstallHours(parseFloat(e.target.value) || 0)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kalkylerad restid (timmar)</Label>
            <Input
              type="number" min={0} step={1}
              value={travelHours}
              onChange={e => setTravelHours(parseFloat(e.target.value) || 0)}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button size="sm" onClick={handleSave}>Spara</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
