'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePusherChannel } from '@/hooks/usePusherChannel';
import type { PokerParticipantSummary } from '@/types';

interface Story {
  id: string;
  text: string;
  jiraUrl: string | null;
  status: 'pending' | 'open' | 'revealed' | 'closed';
}

interface PokerControlProps {
  code: string;
  sessionId: string;
  initialStory: Story | null;
  initialParticipants: PokerParticipantSummary[];
}

export default function PokerControl({
  code,
  initialStory,
  initialParticipants,
}: PokerControlProps) {
  const t = useTranslations('poker');
  const [participants, setParticipants] = useState<PokerParticipantSummary[]>(initialParticipants);
  const [story, setStory] = useState<Story | null>(initialStory);
  const [votedCount, setVotedCount] = useState(
    () => initialParticipants.filter((p) => p.hasVoted).length,
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [loading, setLoading] = useState(false);

  usePusherChannel(`private-control-${code}`, {
    'participant:joined': (data: unknown) => {
      const payload = data as { participants?: PokerParticipantSummary[] };
      if (payload.participants) {
        setParticipants(payload.participants);
        setVotedCount(payload.participants.filter((p) => p.hasVoted).length);
      }
    },
    'vote:cast': (data: unknown) => {
      const payload = data as {
        participantId: string | null;
        hasVoted: boolean;
        votedCount: number;
        totalCount: number;
      };
      if (payload.participantId === null) {
        // Reset
        setParticipants((prev) => prev.map((p) => ({ ...p, hasVoted: false })));
        setVotedCount(0);
      } else {
        setParticipants((prev) =>
          prev.map((p) =>
            p.participantId === payload.participantId ? { ...p, hasVoted: payload.hasVoted } : p,
          ),
        );
        setVotedCount(payload.votedCount);
      }
    },
  });

  usePusherChannel(`session-${code}`, {
    'story:reset': () => {
      setParticipants((prev) => prev.map((p) => ({ ...p, hasVoted: false })));
      setVotedCount(0);
      if (story) {
        setStory({ ...story, status: 'open' });
      }
    },
    'story:opened': (data: unknown) => {
      const payload = data as { story: { id: string; text: string; jiraUrl: string | null } };
      setStory({ ...payload.story, status: 'open' });
      setParticipants((prev) => prev.map((p) => ({ ...p, hasVoted: false })));
      setVotedCount(0);
    },
    'story:revealed': () => {
      if (story) setStory({ ...story, status: 'revealed' });
    },
    'story:closed': () => {
      if (story) setStory({ ...story, status: 'closed' });
    },
  });

  async function callStoryAction(endpoint: string) {
    if (!story) return;
    setLoading(true);
    try {
      await fetch(`/api/questions/${story.id}/${endpoint}`, { method: 'POST' });
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!story) return;
    setLoading(true);
    setConfirmReset(false);
    try {
      await fetch(`/api/questions/${story.id}/reset`, { method: 'POST' });
    } finally {
      setLoading(false);
    }
  }

  const storyStatus = story?.status;

  return (
    <div className="flex flex-col gap-6">
      {/* Story section */}
      <div
        className="rounded-xl p-5 flex flex-col gap-3"
        style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
      >
        {story ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {story.text}
              </p>
              <span
                className="text-xs px-2 py-0.5 rounded-full shrink-0"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {storyStatus}
              </span>
            </div>
            {story.jiraUrl && (
              <a
                href={story.jiraUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline"
                style={{ color: '#0EA5E9' }}
              >
                {t('jiraLinkLabel')} ↗
              </a>
            )}
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('waitingStory')}
          </p>
        )}
      </div>

      {/* Vote counter */}
      {story && (
        <p className="text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
          {t('votedCount', { voted: votedCount, total: participants.length })}
        </p>
      )}

      {/* Participants */}
      <div
        className="rounded-xl p-5 flex flex-col gap-3"
        style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {t('participants')}
        </p>
        {participants.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('noParticipants')}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {participants.map((p) => (
              <div key={p.participantId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {p.name}
                  </span>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: p.hasVoted ? 'rgba(0,229,160,0.15)' : 'var(--color-bg-elevated)',
                    color: p.hasVoted ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    border: `1px solid ${p.hasVoted ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  {p.hasVoted ? t('voted') : t('pending')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {story && (
        <div className="flex flex-col gap-2">
          {storyStatus === 'pending' && (
            <button
              onClick={() => callStoryAction('open')}
              disabled={loading}
              className="w-full rounded-lg px-4 py-3 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)', color: '#0D1117' }}
            >
              {t('openVoting')}
            </button>
          )}
          {storyStatus === 'open' && (
            <button
              onClick={() => callStoryAction('reveal')}
              disabled={loading}
              className="w-full rounded-lg px-4 py-3 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)', color: '#0D1117' }}
            >
              {t('revealButton')}
            </button>
          )}
          {(storyStatus === 'revealed' || storyStatus === 'closed') && (
            <>
              {confirmReset ? (
                <div
                  className="rounded-xl p-4 flex flex-col gap-3"
                  style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('resetConfirm')}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="flex-1 rounded-lg px-4 py-2 text-sm font-medium"
                      style={{
                        backgroundColor: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {t('cancelReset')}
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={loading}
                      className="flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-error)', color: '#fff' }}
                    >
                      {t('resetButton')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  disabled={loading}
                  className="w-full rounded-lg px-4 py-3 text-sm font-medium disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {t('resetButton')}
                </button>
              )}
              {storyStatus === 'revealed' && (
                <button
                  onClick={() => callStoryAction('close')}
                  disabled={loading}
                  className="w-full rounded-lg px-4 py-3 text-sm font-medium disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {t('closeStory')}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
