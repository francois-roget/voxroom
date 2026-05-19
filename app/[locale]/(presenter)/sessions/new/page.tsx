'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export default function NewSessionPage() {
  const router = useRouter();
  const t = useTranslations('sessions.new');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'poll' | 'poker'>('poll');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, kind }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? t('genericError'));
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      <div
        className="w-full max-w-md rounded-xl p-8 flex flex-col gap-6"
        style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
      >
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
            {t('title')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {t('subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {t('nameLabel')}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              required
              className="rounded-lg px-4 py-3 text-sm outline-none transition-colors"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {t('kindLabel')}
            </label>
            <div className="flex gap-2">
              {(['poll', 'poker'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className="flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: kind === k ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                    border: `1px solid ${kind === k ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    color: kind === k ? '#0D1117' : 'var(--color-text-secondary)',
                  }}
                >
                  {k === 'poll' ? t('kindPoll') : t('kindPoker')}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm" style={{ color: 'var(--color-error)' }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {t('cancelButton')}
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)', color: '#0D1117' }}
            >
              {loading ? t('creatingButton') : t('createButton')}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
