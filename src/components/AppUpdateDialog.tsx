import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function AppUpdateDialog({ open }: { open: boolean }) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-sm"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Ny version tillgänglig</AlertDialogTitle>
          <AlertDialogDescription>
            En uppdaterad version av PM Master har publicerats. Ladda om sidan för
            att fortsätta med den senaste versionen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={() => window.location.reload()} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Ladda om sidan
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
