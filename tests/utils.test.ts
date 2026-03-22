import { describe, it, expect } from 'vitest';
import { generateSessionCode, aggregateResults } from '@/lib/utils';

describe('generateSessionCode', () => {
  it('returns a 4-character string', () => {
    expect(generateSessionCode()).toHaveLength(4);
  });

  it('only contains [A-Z0-9] characters', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateSessionCode();
      expect(code).toMatch(/^[A-Z0-9]{4}$/);
    }
  });

  it('generates different codes (not always the same)', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateSessionCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('aggregateResults', () => {
  it('counts occurrences and calculates percentages', () => {
    const result = aggregateResults(['A', 'A', 'B', 'C']);
    expect(result['A']).toEqual({ count: 2, percent: 50 });
    expect(result['B']).toEqual({ count: 1, percent: 25 });
    expect(result['C']).toEqual({ count: 1, percent: 25 });
  });

  it('returns empty object for empty input', () => {
    expect(aggregateResults([])).toEqual({});
  });

  it('returns 100% for single value', () => {
    const result = aggregateResults(['A', 'A', 'A']);
    expect(result['A']).toEqual({ count: 3, percent: 100 });
  });
});
