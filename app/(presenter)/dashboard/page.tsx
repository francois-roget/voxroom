import { auth } from '@/auth';
import Link from 'next/link';
import type { ISession } from '@/types';

async function getSessions(): Promise<ISession[]> {
  const session = await auth();
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/sessions`, {
    headers: { Cookie: '' },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function DashboardPage() {
  const session = await auth();
  const sessions = await getSessions();

  return (
    <main className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
              Mes sessions
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {session?.user?.name}
            </p>
          </div>
          <Link
            href="/sessions/new"
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--color-accent)', color: '#0D1117' }}
          >
            + Nouvelle session
          </Link>
        </div>

        {/* Sessions list */}
        {sessions.length === 0 ? (
          <div
            className="rounded-xl p-12 text-center"
            style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
          >
            <p style={{ color: 'var(--color-text-secondary)' }}>Aucune session pour l&apos;instant.</p>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Créez votre première session pour commencer.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map((s) => (
              <div
                key={String(s._id)}
                className="rounded-xl p-5 flex items-center justify-between"
                style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {s.name}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Créée le {new Date(s.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <span
                  className="font-bold tracking-widest text-lg"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}
                >
                  {s.code}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
