export const SALESPEOPLE = ['Mikael', 'Martin', 'Bertil', 'Samuel'] as const;

export const COUNTRIES = ['Sverige', 'Danmark', 'Norge', 'Finland', 'Övriga'] as const;

export const PRODUCTS = [
  'Teleskopläktare',
  'Stadium Comfort',
  'Abacus',
  'Kalle',
  'Teater',
  'Övrigt',
] as const;

export const QUOTE_STATUSES = ['Öppen', 'Order', 'Avböjd', 'Förlorad', 'Pausad'] as const;
export type QuoteStatus = typeof QUOTE_STATUSES[number];

export function statusRowClass(status: string): string {
  switch (status) {
    case 'Order':
      return 'bg-[hsl(var(--primary)/0.10)] hover:bg-[hsl(var(--primary)/0.18)]';
    case 'Avböjd':
    case 'Förlorad':
      return 'bg-[hsl(var(--destructive)/0.08)] hover:bg-[hsl(var(--destructive)/0.15)]';
    case 'Pausad':
      return 'bg-[hsl(25_95%_53%/0.10)] hover:bg-[hsl(25_95%_53%/0.18)]';
    default:
      return 'hover:bg-muted/40';
  }
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'Order':
      return 'bg-primary/15 text-primary border-primary/30';
    case 'Avböjd':
    case 'Förlorad':
      return 'bg-destructive/15 text-destructive border-destructive/30';
    case 'Pausad':
      return 'bg-[hsl(25_95%_53%/0.15)] text-[hsl(25_95%_45%)] border-[hsl(25_95%_53%/0.3)]';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function formatSEK(n: number): string {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(n || 0);
}

export function formatMSEK(n: number): string {
  return (n / 1_000_000).toLocaleString('sv-SE', { maximumFractionDigits: 2 });
}
