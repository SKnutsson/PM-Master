import { describe, it, expect } from 'vitest';
import { getQuoteProducts, productAllocationError } from './quoteProducts';

describe('Quote product allocations', () => {
  it('preserves unknown allocations on legacy multi-product offers', () => {
    expect(getQuoteProducts({ product: 'Teleskopläktare | Kalle', amount: 100 })).toEqual([{ product: 'Teleskopläktare', amount: null }, { product: 'Hörsalsstol Kalle', amount: null }]);
  });
  it('assigns the known total to single-product offers', () => {
    expect(getQuoteProducts({ product: 'Teleskopläktare', amount: 100 })[0].amount).toBe(100);
  });
  it('accepts exact allocations and rejects mismatches and duplicate groups', () => {
    const rows = [{ product: 'A', amount: 60 }, { product: 'B', amount: 40 }];
    expect(productAllocationError(rows, 100)).toBeNull();
    expect(productAllocationError(rows, 200)).not.toBeNull();
    expect(productAllocationError([{ product: 'A', amount: 60 }, { product: 'A', amount: 40 }], 100)).not.toBeNull();
    expect(productAllocationError([{ product: 'A', amount: null }], 100)).not.toBeNull();
  });
});