import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { Installer, ProjectInstaller } from '@/hooks/useResourceData';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  projectName: string;
  installers: Installer[];
  projectInstallers: ProjectInstaller[];
  onAssign: (installerId: string) => Promise<any>;
  onAssignVacant: () => Promise<any>;
  onUnassign: (projectInstallerId: string) => Promise<void>;
  trigger: React.ReactNode;
}

export function AssignInstallerDialog({ projectName, installers, projectInstallers, onAssign, onAssignVacant, onUnassign, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedInstaller, setSelectedInstaller] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<ProjectInstaller | null>(null);

  const assignedIds = new Set(projectInstallers.filter(pi => !pi.isVacant).map(pi => pi.installerId));
  const available = installers.filter(i => !assignedIds.has(i.id));

  const handleAssign = async () => {
    if (!selectedInstaller) return;
    if (selectedInstaller === 'vakant') {
      await onAssignVacant();
    } else {
      await onAssign(selectedInstaller);
    }
    setSelectedInstaller('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Montörer – {projectName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Assigned list */}
            {projectInstallers.length > 0 ? (
              <div className="space-y-1">
                {projectInstallers.map(pi => (
                  <div key={pi.id} className="flex items-center justify-between p-1.5 rounded bg-muted/30 border border-border/30">
                    <div className="min-w-0">
                      {pi.isVacant ? (
                        <span className="text-xs font-medium text-destructive">Vakant</span>
                      ) : (
                        <>
                          <span className="text-xs font-medium">{pi.installerName}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">({pi.installerCompany})</span>
                        </>
                      )}
                    </div>
                    <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive shrink-0"
                      onClick={() => setConfirmDelete(pi)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground italic">Inga montörer kopplade ännu</p>
            )}

            {/* Add new */}
            <div className="flex items-center gap-2">
              <Select value={selectedInstaller} onValueChange={setSelectedInstaller}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Välj montör" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vakant" className="text-xs text-destructive font-medium">Vakant</SelectItem>
                  {available.map(i => (
                    <SelectItem key={i.id} value={i.id} className="text-xs">{i.name} ({i.company})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 text-xs" onClick={handleAssign} disabled={!selectedInstaller}>Lägg till</Button>
            </div>
            {installers.length === 0 && (
              <p className="text-[10px] text-muted-foreground">Skapa montörer först via "Montörer"-knappen</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Ta bort montör?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {confirmDelete?.isVacant
                ? 'Den vakanta platsen tas bort.'
                : `Alla dagposter för ${confirmDelete?.installerName} i detta projekt raderas.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Avbryt</AlertDialogCancel>
            <AlertDialogAction className="h-8 text-xs" onClick={() => { if (confirmDelete) onUnassign(confirmDelete.id); setConfirmDelete(null); }}>
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
