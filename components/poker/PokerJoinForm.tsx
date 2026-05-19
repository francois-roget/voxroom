'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { getOrCreateParticipantId, setParticipantName } from '@/lib/localStorage';

interface PokerJoinFormProps {
  sessionCode: string;
  onJoined: (participant: { participantId: string; name: string; color: string }) => void;
}

export default function PokerJoinForm({ sessionCode, onJoined }: PokerJoinFormProps) {
  const t = useTranslations('poker');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const participantId = getOrCreateParticipantId();
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionCode, participantId, name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Error joining session');
        return;
      }

      const result = await res.json() as { participantId: string; name: string; color: string };
      setParticipantName(sessionCode, name.trim());
      onJoined(result);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-bg-base)' }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-8 flex flex-col gap-6"
        style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
      >
        <div>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            {t('namePromptTitle')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {t('namePromptSubtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            maxLength={32}
            required
            autoFocus
            className="rounded-lg px-4 py-3 text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />

          {error && (
            <p className="text-sm" style={{ color: 'var(--color-error)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="rounded-lg px-4 py-3 text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)', color: '#0D1117' }}
          >
            {t('joinButton')}
          </button>
        </form>
      </div>
    </main>
  );
}
