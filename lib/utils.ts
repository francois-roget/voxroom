import type { AggregatedResult } from '@/types';

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateSessionCode(): string {
  return Array.from(
    { length: 4 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('');
}

export function aggregateResults(values: string[]): AggregatedResult {
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  const total = values.length;
  const result: AggregatedResult = {};
  for (const [choice, count] of Object.entries(counts)) {
    result[choice] = {
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  }
  return result;
}
