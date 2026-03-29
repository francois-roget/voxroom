'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { usePusherChannel } from '@/hooks/usePusherChannel';
import LoadingScreen from '@/components/shared/LoadingScreen';
import ErrorCard from '@/components/shared/ErrorCard';
import type { IQuestion, ISession, AggregatedResult } from '@/types';

export default function ControlPage() {
  const { code } = useParams<{ code: string }>();
  const t = useTranslations('sessions.control');

  const STATUS_LABEL: Record<string, string> = {
    pending: t('statusPending'),
    open: t('statusOpen'),
    revealed: t('statusRevealed'),
    closed: t('statusClosed'),
  };

  const [session, setSession] = useState<ISession | null>(null);
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [liveCount, setLiveCount] = useState(0);
  const [liveResults, setLiveResults] = useState<AggregatedResult | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${code}`);
      if (!res.ok) { setError(t('sessionNotFound')); return; }
      const data = await res.json();
      setSession(data.session);
      setQuestions(data.questions);
      setLiveCount(data.responseCount ?? 0);
    } catch {
      setError(t('loadingError'));
    } finally {
      setLoading(false);
    }
  }, [code, t]);

  useEffect(() => { load(); }, [load]);

  usePusherChannel(`private-control-${code.toUpperCase()}`, {
    'response:new': (data) => {
      const payload = data as { count: number; results: AggregatedResult };
      setLiveCount(payload.count);
      setLiveResults(payload.results);
    },
  });

  async function action(questionId: string, endpoint: 'open' | 'close' | 'reveal') {
    setActionLoading(`${questionId}-${endpoint}`);
    try {
      await fetch(`/api/questions/${questionId}/${endpoint}`, { method: 'POST' });
      await load();
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <LoadingScreen />;

  if (error || !session) {
    return <ErrorCard message={error || t('sessionNotFound')} href="/dashboard" linkText={t('backToDashboard')} />;
  }

  const sessionStatusLabel =
    session.status === 'active'
      ? t('sessionStatusActive')
      : session.status === 'waiting'
      ? t('sessionStatusWaiting')
      : t('sessionStatusClosed');

  return (
    <main className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
              {session.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-lg font-bold tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
                {session.code}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{
                backgroundColor: session.status === 'active' ? 'rgba(0,229,160,0.15)' : 'var(--color-bg-elevated)',
                color: session.status === 'active' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                border: `1px solid ${session.status === 'active' ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}>
                {sessionStatusLabel}
              </span>
            </div>
          </div>
          <Link
            href={`/sessions/${code}/edit`}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            {t('editButton')}
          </Link>
        </div>

        {/* Questions */}
        {questions.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
          >
            <p style={{ color: 'var(--color-text-secondary)' }}>{t('noQuestions')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {questions.map((q, i) => {
              const isOpen = q.status === 'open';
              const isRevealed = q.status === 'revealed';
              const isPending = q.status === 'pending';
              const isClosed = q.status === 'closed';
              const showLive = isOpen && liveCount > 0;

              return (
                <div
                  key={String(q._id)}
                  className="rounded-xl p-5 flex flex-col gap-4"
                  style={{
                    backgroundColor: 'var(--color-bg-surface)',
                    border: `1px solid ${isOpen ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3 items-start">
                      <span className="text-xs font-bold mt-0.5 w-5 text-right shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                        {i + 1}
                      </span>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{q.text}</span>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {q.type === 'mcq' ? t('mcqLabel', { choices: q.choices.join(', ') }) : t('wordcloudLabel')}
                        </span>
                      </div>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: isOpen ? 'rgba(0,229,160,0.15)' : 'var(--color-bg-elevated)',
                        color: isOpen ? 'var(--color-accent)' : 'var(--color-text-muted)',
                        border: `1px solid ${isOpen ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      }}
                    >
                      {STATUS_LABEL[q.status]}
                    </span>
                  </div>

                  {/* Live counter */}
                  {showLive && (
                    <div className="flex items-center gap-2">
                      <span
                        className="text-2xl font-black"
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}
                      >
                        {liveCount}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('responseCount', { count: liveCount })}
                      </span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {(isPending || isClosed) && (
                      <button
                        onClick={() => action(String(q._id), 'open')}
                        disabled={actionLoading !== null}
                        className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                        style={{ backgroundColor: 'var(--color-accent)', color: '#0D1117' }}
                      >
                        {actionLoading === `${q._id}-open` ? '…' : t('launchButton')}
                      </button>
                    )}
                    {isOpen && (
                      <>
                        <button
                          onClick={() => action(String(q._id), 'reveal')}
                          disabled={actionLoading !== null}
                          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                          style={{ backgroundColor: 'var(--color-accent-blue)', color: '#fff' }}
                        >
                          {actionLoading === `${q._id}-reveal` ? '…' : t('revealButton')}
                        </button>
                        <button
                          onClick={() => action(String(q._id), 'close')}
                          disabled={actionLoading !== null}
                          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                          style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                        >
                          {actionLoading === `${q._id}-close` ? '…' : t('closeButton')}
                        </button>
                      </>
                    )}
                    {isRevealed && (
                      <button
                        onClick={() => action(String(q._id), 'close')}
                        disabled={actionLoading !== null}
                        className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                        style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                      >
                        {actionLoading === `${q._id}-close` ? '…' : t('closeButton')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
