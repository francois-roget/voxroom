export const POKER_DECK = ['1', '2', '3', '5', '8', '13', '21', '?', '∞'] as const;
export type PokerCard = (typeof POKER_DECK)[number];

export const POKER_COLORS = [
  '#00E5A0', '#0EA5E9', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
  '#10B981', '#3B82F6', '#F97316', '#14B8A6', '#A855F7', '#F43F5E',
];

export function assertPokerValue(v: unknown): asserts v is PokerCard {
  if (typeof v !== 'string' || !(POKER_DECK as readonly string[]).includes(v)) {
    throw new Error('Invalid poker value');
  }
}

export function assignColor(participantIndex: number): string {
  return POKER_COLORS[participantIndex % POKER_COLORS.length];
}
