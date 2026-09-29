import { describe, expect, it } from 'vitest';

import {
  MAX_TPE_AMOUNT_CENTS,
  appendTpeDigit,
  backspaceTpeCents,
  centsFromDigitString,
  formatTpeAmount,
} from '../../../app/utils/money';

describe('TPE amount utils', () => {
  it('empile les chiffres comme un TPE', () => {
    let cents = 0;
    cents = appendTpeDigit(cents, 1);
    expect(cents).toBe(1);
    expect(formatTpeAmount(cents)).toBe('0,01');
    cents = appendTpeDigit(cents, 2);
    cents = appendTpeDigit(cents, 5);
    expect(cents).toBe(125);
    expect(formatTpeAmount(cents)).toBe('1,25');
  });

  it('retire le dernier chiffre au backspace', () => {
    expect(backspaceTpeCents(125)).toBe(12);
    expect(formatTpeAmount(12)).toBe('0,12');
    expect(backspaceTpeCents(0)).toBe(0);
  });

  it('respecte le plafond', () => {
    const atMax = appendTpeDigit(MAX_TPE_AMOUNT_CENTS, 0);
    expect(atMax).toBe(MAX_TPE_AMOUNT_CENTS);
    expect(appendTpeDigit(MAX_TPE_AMOUNT_CENTS, 1)).toBe(MAX_TPE_AMOUNT_CENTS);
  });

  it('parse le collage en buffer centimes', () => {
    expect(centsFromDigitString('1250')).toBe(1250);
    expect(formatTpeAmount(1250)).toBe('12,50');
    expect(centsFromDigitString('12,50')).toBe(1250);
    expect(centsFromDigitString('12.50')).toBe(1250);
    expect(centsFromDigitString('')).toBe(0);
    expect(centsFromDigitString('abc')).toBe(0);
  });

  it('ignore les chiffres invalides à l’empilement', () => {
    expect(appendTpeDigit(10, -1)).toBe(10);
    expect(appendTpeDigit(10, 10)).toBe(10);
  });
});
