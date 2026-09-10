import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Icke-blockerande notis om ny publicerad version. Användaren kan fortsätta
 * fylla i formulär – sidan laddas bara om när man själv klickar "Uppdatera".
 */
export function AppUpdateDialog({ open }: { open: boolean }) {
  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-lg border border-border bg-card p-4 shadow-lg">
      <p className="text-sm font-medium">En ny version av CRM-systemet finns tillgänglig.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Dina osparade ändringar påverkas inte förrän du väljer att uppdatera.
      </p>
      <Button size="sm" className="mt-3 w-full" onClick={() => window.location.reload()}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Uppdatera
      </Button>
    </div>
  );
}
