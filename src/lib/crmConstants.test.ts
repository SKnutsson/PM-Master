import { describe, expect, it } from 'vitest';
import { followupCellClass, isSettledQuote } from './crmConstants';

const TODAY = '2026-11-04';

describe('followupCellClass', () => {
  it('visar grönt för försenat uppföljningsdatum när offerten är förlorad', () => {
    expect(followupCellClass('Förlorad', '2026-10-23', TODAY)).toBe('followup-upcoming');
  });

  it('visar grönt för försenat uppföljningsdatum när offerten är avböjd', () => {
    expect(followupCellClass('Avböjd', '2026-10-23', TODAY)).toBe('followup-upcoming');
  });

  it('visar grönt för försenat uppföljningsdatum när offerten är order', () => {
    expect(followupCellClass('Order', '2026-10-23', TODAY)).toBe('followup-upcoming');
  });

  it('visar grönt för framtida uppföljningsdatum när offerten är förlorad', () => {
    expect(followupCellClass('Förlorad', '2027-01-15', TODAY)).toBe('followup-upcoming');
  });

  it('visar grönt för framtida uppföljningsdatum när offerten är order', () => {
    expect(followupCellClass('Order', '2027-01-15', TODAY)).toBe('followup-upcoming');
  });

  it('visar rött för försenat uppföljningsdatum när offerten är öppen', () => {
    expect(followupCellClass('Öppen', '2026-10-23', TODAY)).toBe('followup-overdue');
  });

  it('visar grönt för uppföljningsdatum idag eller senare när offerten är öppen', () => {
    expect(followupCellClass('Öppen', '2027-01-15', TODAY)).toBe('followup-upcoming');
    expect(followupCellClass('Öppen', TODAY, TODAY)).toBe('followup-upcoming');
  });

  it('visar rött för försenat uppföljningsdatum när offerten är pausad', () => {
    expect(followupCellClass('Pausad', '2026-10-23', TODAY)).toBe('followup-overdue');
  });

  it('visar ingen färg när offerten inte har något uppföljningsdatum', () => {
    expect(followupCellClass('Förlorad', null, TODAY)).toBe('');
    expect(followupCellClass('Order', null, TODAY)).toBe('');
    expect(followupCellClass('Öppen', null, TODAY)).toBe('');
  });

  it('känner igen order, avböjd och förlorad som avgjorda affärer', () => {
    expect(isSettledQuote('Order')).toBe(true);
    expect(isSettledQuote('Avböjd')).toBe(true);
    expect(isSettledQuote('Förlorad')).toBe(true);
    expect(isSettledQuote('Öppen')).toBe(false);
    expect(isSettledQuote('Pausad')).toBe(false);
  });
});
