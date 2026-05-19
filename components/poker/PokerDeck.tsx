'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { POKER_DECK } from '@/lib/poker';
import { hasAnswered, markAnswered } from '@/lib/localStorage';

interface PokerDeckProps {
  questionId: string;
  sessionId: string;
  participantId: string;
  participantName: string;
  onVoted: () => void;
}

export default function PokerDeck({
  questionId,
  sessionId,
  participantId,
  participantName,
  onVoted,
}: PokerDeckProps) {
  const t = useTranslations('poker');
  const [voted, setVoted] = useState(() => hasAnswered(questionId));
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCardClick(card: string) {
    if (voted || loading) return;

    setSelected(card);
    setLoading(true);

    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, sessionId, participantId, value: card, participantName }),
      });

      if (res.status === 409) {
        // Already voted — treat as success
        markAnswered(questionId);
        setVoted(true);
        onVoted();
        return;
      }

      if (!res.ok) {
        setSelected(null);
        return;
      }

      markAnswered(questionId);
      setVoted(true);
      onVoted();
    } catch {
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }

  if (voted) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 p-4"
        style={{ backgroundColor: 'var(--color-bg-base)' }}
      >
        <p className="text-lg font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {t('voteSubmitted')}
        </p>
        {selected && (
          <div
            className="rounded-xl flex items-center justify-center w-24 h-36"
            style={{ backgroundColor: 'rgba(0,229,160,0.15)', border: '2px solid var(--color-accent)' }}
          >
            <span
              className="text-4xl font-black"
              style={{ color: 'var(--color-accent)' }}
            >
              {selected}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 p-4"
      style={{ backgroundColor: 'var(--color-bg-base)' }}
    >
      <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
        {t('votingOpen')}
      </p>
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {POKER_DECK.map((card) => (
          <button
            key={card}
            onClick={() => handleCardClick(card)}
            disabled={loading}
            className="rounded-xl flex items-center justify-center aspect-[2/3] text-3xl font-black transition-transform active:scale-95 disabled:opacity-50"
            style={{
              backgroundColor:
                selected === card
                  ? 'rgba(0,229,160,0.2)'
                  : 'var(--color-bg-surface)',
              border: `2px solid ${selected === card ? 'var(--color-accent)' : 'var(--color-border)'}`,
              color: selected === card ? 'var(--color-accent)' : 'var(--color-text-primary)',
              minHeight: '80px',
            }}
          >
            {card}
          </button>
        ))}
      </div>
    </div>
  );
}
