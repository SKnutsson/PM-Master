import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Installer, ProjectInstaller } from '@/hooks/useResourceData';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectInstaller: ProjectInstaller | null;
  installers: Installer[];
  projectInstallers: ProjectInstaller[]; // all installers on this project
  onReassign: (projectInstallerId: string, newInstallerId: string | null, isVacant: boolean) => Promise<void>;
}

export function ReassignInstallerDialog({ open, onOpenChange, projectInstaller, installers, projectInstallers, onReassign }: Props) {
  const [selectedInstallerId, setSelectedInstallerId] = useState('');

  if (!projectInstaller) return null;

  // Filter out installers already assigned to this project (except current one)
  const assignedIds = new Set(
    projectInstallers
      .filter(pi => pi.id !== projectInstaller.id)
      .map(pi => pi.installerId)
  );
  const available = installers.filter(i => !assignedIds.has(i.id));

  const handleSave = async () => {
    if (selectedInstallerId === 'vakant') {
      await onReassign(projectInstaller.id, null, true);
    } else if (selectedInstallerId) {
      await onReassign(projectInstaller.id, selectedInstallerId, false);
    }
    setSelectedInstallerId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSelectedInstallerId(''); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Byt montör</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Nuvarande: <span className={projectInstaller.isVacant ? 'text-destructive font-medium' : 'font-medium text-foreground'}>
              {projectInstaller.isVacant ? 'Vakant' : projectInstaller.installerName}
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            Välj ny montör – tiderna i schemat behålls.
          </p>
          <Select value={selectedInstallerId} onValueChange={setSelectedInstallerId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Välj montör..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vakant" className="text-xs text-destructive font-medium">
                Vakant
              </SelectItem>
              {available.map(i => (
                <SelectItem key={i.id} value={i.id} className="text-xs">
                  {i.name} ({i.company})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setSelectedInstallerId(''); onOpenChange(false); }}>
              Avbryt
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={!selectedInstallerId}>
              Byt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
