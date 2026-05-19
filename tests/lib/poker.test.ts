import { describe, it, expect } from 'vitest';
import { POKER_DECK, assertPokerValue, assignColor, POKER_COLORS } from '@/lib/poker';

describe('assertPokerValue', () => {
  it('accepts every deck value', () => {
    POKER_DECK.forEach((v) => expect(() => assertPokerValue(v)).not.toThrow());
  });
  it.each(['42', '', '2 ', null, undefined, 0])('rejects %s', (v) => {
    expect(() => assertPokerValue(v)).toThrow();
  });
});

describe('assignColor', () => {
  it('returns first color for index 0', () => {
    expect(assignColor(0)).toBe(POKER_COLORS[0]);
  });
  it('wraps around at palette length', () => {
    expect(assignColor(POKER_COLORS.length)).toBe(POKER_COLORS[0]);
  });
  it('returns 12th color for index 11', () => {
    expect(assignColor(11)).toBe(POKER_COLORS[11]);
  });
});
