import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Session from '@/models/Session';
import Question from '@/models/Question';
import { Link } from '@/i18n/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ISession } from '@/types';
import type { Types } from 'mongoose';

interface SessionWithStats extends ISession {
  questionCount: number;
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('dashboard');

  const STATUS_LABEL: Record<string, string> = {
    waiting: t('statusWaiting'),
    active: t('statusActive'),
    closed: t('statusClosed'),
  };

  const session = await auth();

  let sessions: SessionWithStats[] = [];
  if (session?.user?.email) {
    await connectDB();
    const dbUser = await User.findOne({ email: session.user.email }).lean() as { _id: Types.ObjectId } | null;
    if (dbUser) {
      const rawSessions = await Session.find({ ownerId: dbUser._id })
        .sort({ createdAt: -1 })
        .lean() as unknown as ISession[];

      const sessionIds = rawSessions.map((s) => s._id);
      const questionCounts = await Question.aggregate([
        { $match: { sessionId: { $in: sessionIds } } },
        { $group: { _id: '$sessionId', count: { $sum: 1 } } },
      ]) as { _id: unknown; count: number }[];

      const countMap = new Map(questionCounts.map((q) => [String(q._id), q.count]));

      sessions = rawSessions.map((s) => ({
        ...s,
        questionCount: countMap.get(String(s._id)) ?? 0,
      }));
    }
  }

  return (
    <main className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
              {t('title')}
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
            {t('newSession')}
          </Link>
        </div>

        {/* Sessions list */}
        {sessions.length === 0 ? (
          <div
            className="rounded-xl p-12 text-center"
            style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
          >
            <p style={{ color: 'var(--color-text-secondary)' }}>{t('emptyTitle')}</p>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {t('emptyDescription')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map((s) => (
              <div
                key={String(s._id)}
                className="rounded-xl p-5 flex items-center justify-between gap-4"
                style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {s.name}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {t('createdOn', { date: new Date(s.createdAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB') })}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>·</span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {t('questionCount', { count: s.questionCount })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: s.kind === 'poker' ? 'rgba(14,165,233,0.15)' : 'var(--color-bg-elevated)',
                      color: s.kind === 'poker' ? '#0EA5E9' : 'var(--color-text-muted)',
                      border: `1px solid ${s.kind === 'poker' ? '#0EA5E9' : 'var(--color-border)'}`,
                    }}
                  >
                    {s.kind === 'poker' ? t('kindPoker') : t('kindPoll')}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        s.status === 'active'
                          ? 'rgba(0,229,160,0.15)'
                          : s.status === 'closed'
                          ? 'rgba(248,81,73,0.15)'
                          : 'var(--color-bg-elevated)',
                      color:
                        s.status === 'active'
                          ? 'var(--color-accent)'
                          : s.status === 'closed'
                          ? 'var(--color-error)'
                          : 'var(--color-text-muted)',
                      border: `1px solid ${
                        s.status === 'active'
                          ? 'var(--color-accent)'
                          : s.status === 'closed'
                          ? 'var(--color-error)'
                          : 'var(--color-border)'
                      }`,
                    }}
                  >
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                  <span
                    className="font-bold tracking-widest text-lg"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}
                  >
                    {s.code}
                  </span>
                  <Link
                    href={`/sessions/${s.code}/edit`}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium"
                    style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    {t('editButton')}
                  </Link>
                  <Link
                    href={`/sessions/${s.code}/control`}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium"
                    style={{ backgroundColor: 'var(--color-accent)', color: '#0D1117' }}
                  >
                    {t('controlButton')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
