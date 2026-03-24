'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized.length !== 4) {
      setError('Le code fait 4 caractères.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${normalized}`);
      if (!res.ok) {
        setError('Session introuvable. Vérifie le code.');
        return;
      }
      router.push(`/session/${normalized}`);
    } catch {
      setError('Impossible de rejoindre la session.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      <div
        className="w-full max-w-sm rounded-xl p-8 flex flex-col gap-6"
        style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
            VoxRoom
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            Entre le code de ta session
          </p>
        </div>

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

          {error && <p className="text-sm text-center" style={{ color: 'var(--color-error)' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading || code.trim().length === 0}
            className="rounded-lg px-4 py-3 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)', color: '#0D1117' }}
          >
            {loading ? 'Vérification…' : 'Rejoindre'}
          </button>
        </form>
      </div>
    </main>
  );
}
