import { describe, it, expect } from 'vitest';
import { deliveryMonthError, monthInputToDate } from './deliveryMonth';

describe('deliveryMonthError', () => {
  it('kräver månad vid sannolikhet 4', () => expect(deliveryMonthError(4, 'Öppen', null)).not.toBeNull());
  it('kräver månad vid sannolikhet 5', () => expect(deliveryMonthError(5, 'Order', '')).not.toBeNull());
  it('kräver inte månad vid sannolikhet 3', () => expect(deliveryMonthError(3, 'Öppen', null)).toBeNull());
  it('kräver inte månad för förlorad offert', () => expect(deliveryMonthError(5, 'Förlorad', null)).toBeNull());
  it('godkänner när månad finns', () => expect(deliveryMonthError(4, 'Öppen', '2027-03-01')).toBeNull());
});

describe('monthInputToDate', () => {
  it('konverterar till första dagen i månaden', () => expect(monthInputToDate('2027-03')).toBe('2027-03-01'));
});
