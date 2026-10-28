// Quotes with probability 4–5 must carry a delivery month so they can be placed in the sales budget.
const CLOSED_STATUSES = ['Förlorad', 'Avböjd'];

export function requiresDeliveryMonth(probability: number | null | undefined, status: string | null | undefined): boolean {
  return Number(probability) >= 4 && !CLOSED_STATUSES.includes(status || '');
}

export function deliveryMonthError(probability: number | null | undefined, status: string | null | undefined, deliveryMonth: string | null | undefined): string | null {
  if (requiresDeliveryMonth(probability, status) && !deliveryMonth) {
    return 'Ange leveransmånad – krävs för offerter med sannolikhet 4 eller 5';
  }
  return null;
}

/** "2027-03" -> "2027-03-01"; "" -> null */
export function monthInputToDate(value: string): string | null {
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : null;
}

/** "2027-03-01" -> "2027-03" */
export function dateToMonthInput(value: string | null | undefined): string {
  return value ? value.slice(0, 7) : '';
}
