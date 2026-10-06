export interface ProductAllocation { product: string; amount: number | null }

const aliases: Record<string, string> = {
  'stadion comfort': 'Läktarstol Stadium Comfort',
  'läktarstol stadion comfort': 'Läktarstol Stadium Comfort',
  'abacus': 'Läktarstol Abacus',
  'kalle': 'Hörsalsstol Kalle',
  'teater': 'Teaterstol',
};

export function getQuoteProducts(quote: { product?: string; amount?: number; product_allocations?: ProductAllocation[] | null }): ProductAllocation[] {
  if (quote.product_allocations?.length) return quote.product_allocations;
  const products = [...new Set((quote.product || '').split('|').map((p) => {
    const name = p.trim();
    return aliases[name.toLocaleLowerCase('sv-SE')] || name;
  }).filter(Boolean))];
  return products.map((product) => ({ product, amount: products.length === 1 ? Number(quote.amount || 0) : null }));
}

export function productAllocationError(rows: ProductAllocation[], total: number): string | null {
  if (!rows.length || rows.some((r) => !r.product.trim())) return 'Välj en produktgrupp på varje rad.';
  if (new Set(rows.map((r) => r.product)).size !== rows.length) return 'Varje produktgrupp får bara finnas en gång.';
  if (rows.some((r) => r.amount === null || !Number.isFinite(r.amount) || r.amount < 0)) return 'Ange ett giltigt belopp för varje produktgrupp.';
  const sum = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
  return Math.abs(sum - total) > 0.01 ? 'Fördelningen måste vara lika med offertbeloppet.' : null;
}