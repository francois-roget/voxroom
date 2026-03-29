'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

type JoinFormProps = {
  compact?: boolean;
};

export default function JoinForm({ compact = false }: JoinFormProps) {
  const router = useRouter();
  const t = useTranslations('join');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized.length !== 4) {
      setError(t('codeLengthError'));
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${normalized}`);
      if (!res.ok) {
        setError(t('sessionNotFound'));
        return;
      }
      router.push(`/session/${normalized}`);
    } catch {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  }

  const form = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="AB12"
        maxLength={4}
        required
        className="rounded-lg px-4 py-4 text-center text-2xl font-bold tracking-widest outline-none uppercase"
        style={{
          fontFamily: 'var(--font-mono)',
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-accent)',
        }}
      />

      {error && (
        <div
          className="rounded-lg p-3 text-sm text-center"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-error)',
            color: 'var(--color-error)',
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg px-4 py-3 text-sm font-medium disabled:opacity-50 min-h-[48px]"
        style={{ backgroundColor: 'var(--color-accent)', color: '#0D1117' }}
      >
        {loading ? t('loadingButton') : t('submitButton')}
      </button>
    </form>
  );

  if (compact) {
    return form;
  }

  return (
    <div
      className="w-full max-w-sm rounded-xl p-8 flex flex-col gap-6"
      style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
          {t('title')}
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
          {t('subtitle')}
        </p>
      </div>
      {form}
    </div>
  );
}
