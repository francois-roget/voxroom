'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import { usePusherChannel } from '@/hooks/usePusherChannel';
import type { PokerParticipantSummary, PokerVote } from '@/types';

interface Story {
  id: string;
  text: string;
  jiraUrl: string | null;
  status: string;
}

interface PokerPresenterProps {
  code: string;
  sessionName: string;
  initialStory: Story | null;
  initialParticipants: PokerParticipantSummary[];
  initialVotes: PokerVote[];
}

type Phase = 'waiting' | 'open' | 'revealed';

export default function PokerPresenter({
  code,
  sessionName,
  initialStory,
  initialParticipants,
  initialVotes,
}: PokerPresenterProps) {
  const t = useTranslations('poker');

  const derivePhase = (s: Story | null): Phase => {
    if (!s) return 'waiting';
    if (s.status === 'open') return 'open';
    if (s.status === 'revealed') return 'revealed';
    return 'waiting';
  };

  const [participants, setParticipants] = useState<PokerParticipantSummary[]>(initialParticipants);
  const [votes, setVotes] = useState<PokerVote[]>(initialVotes);
  const [story, setStory] = useState<Story | null>(initialStory);
  const [phase, setPhase] = useState<Phase>(() => derivePhase(initialStory));
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/session/${code}`);
  }, [code]);

  usePusherChannel(`session-${code}`, {
    'participant:joined': (data: unknown) => {
      const payload = data as { participantId: string; name: string; color: string };
      setParticipants((prev) => {
        const exists = prev.find((p) => p.participantId === payload.participantId);
        if (exists) return prev;
        return [...prev, { ...payload, hasVoted: false }];
      });
    },
    'story:opened': (data: unknown) => {
      const payload = data as { story: { id: string; text: string; jiraUrl: string | null } };
      setStory({ ...payload.story, status: 'open' });
      setPhase('open');
      setVotes([]);
      setParticipants((prev) => prev.map((p) => ({ ...p, hasVoted: false })));
    },
    'vote:cast': (data: unknown) => {
      const payload = data as {
        participantId: string | null;
        hasVoted: boolean;
      };
      if (payload.participantId !== null) {
        setParticipants((prev) =>
          prev.map((p) =>
            p.participantId === payload.participantId ? { ...p, hasVoted: payload.hasVoted } : p,
          ),
        );
      }
    },
    'story:revealed': (data: unknown) => {
      const payload = data as { votes: PokerVote[] };
      setVotes(payload.votes);
      setPhase('revealed');
      if (story) setStory({ ...story, status: 'revealed' });
    },
    'story:closed': () => {
      setPhase('waiting');
      if (story) setStory({ ...story, status: 'closed' });
    },
    'story:reset': () => {
      setPhase('open');
      setVotes([]);
      setParticipants((prev) => prev.map((p) => ({ ...p, hasVoted: false })));
      if (story) setStory({ ...story, status: 'open' });
    },
  });

  const votedCount = participants.filter((p) => p.hasVoted).length;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 gap-8"
      style={{ backgroundColor: 'var(--color-bg-base)' }}
    >
      {/* Waiting phase */}
      {phase === 'waiting' && (
        <div className="flex flex-col items-center gap-6 text-center">
          <h1
            className="text-4xl font-black"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            {sessionName}
          </h1>
          <div className="flex flex-col items-center gap-4">
            <div
              className="rounded-2xl px-8 py-4"
              style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
            >
              <p className="text-sm mb-2 text-center" style={{ color: 'var(--color-text-muted)' }}>
                {t('codeLabel')}
              </p>
              <span
                className="text-5xl font-black tracking-widest"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}
              >
                {code}
              </span>
            </div>
            {joinUrl && (
              <div
                className="rounded-2xl p-4"
                style={{ backgroundColor: '#ffffff' }}
              >
                <QRCodeSVG value={joinUrl} size={180} />
              </div>
            )}
          </div>
          <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            {t('waitingStory')}
          </p>
          {participants.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {participants.map((p) => (
                <div
                  key={p.participantId}
                  className="flex items-center gap-2 rounded-full px-3 py-1 text-sm"
                  style={{ backgroundColor: p.color + '22', border: `1px solid ${p.color}` }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span style={{ color: p.color }}>{p.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Open phase */}
      {phase === 'open' && story && (
        <div className="flex flex-col items-center gap-6 text-center w-full max-w-2xl">
          <p
            className="text-3xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            {story.text}
          </p>
          {story.jiraUrl && (
            <a
              href={story.jiraUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline"
              style={{ color: '#0EA5E9' }}
            >
              {t('jiraLinkLabel')} ↗
            </a>
          )}
          <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
            {votedCount} / {participants.length}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {participants.map((p) => (
              <div
                key={p.participantId}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold transition-all"
                  style={{
                    backgroundColor: p.hasVoted ? p.color : 'var(--color-bg-elevated)',
                    border: `3px solid ${p.color}`,
                    color: p.hasVoted ? '#0D1117' : p.color,
                  }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revealed phase */}
      {phase === 'revealed' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
          {story && (
            <p
              className="text-2xl font-bold text-center"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {story.text}
            </p>
          )}
          <p className="text-xl font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {t('revealTitle')}
          </p>
          {votes.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>—</p>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', width: '100%' }}>
              {votes.map((vote) => (
                <div
                  key={vote.participantId}
                  className="rounded-xl flex flex-col items-center justify-center p-4 aspect-[2/3] min-w-[100px]"
                  style={{
                    backgroundColor: vote.color + '33',
                    borderColor: vote.color,
                    borderWidth: 2,
                    borderStyle: 'solid',
                  }}
                >
                  <span
                    className="text-5xl font-black"
                    style={{ color: vote.color }}
                  >
                    {vote.value}
                  </span>
                  <span
                    className="text-sm mt-2 font-medium truncate w-full text-center"
                    style={{ color: vote.color }}
                  >
                    {vote.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
