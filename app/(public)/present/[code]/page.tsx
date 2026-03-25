'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { QRCodeSVG } from 'qrcode.react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { getPusherClient } from '@/lib/pusher-client';
import type { IQuestion, ISession, AggregatedResult } from '@/types';

const WordCloud = dynamic(() => import('react-wordcloud'), { ssr: false });

type PresenterState = 'waiting' | 'open' | 'revealed';

interface OpenedPayload {
  question: { id: string; text: string; choices: string[]; type: string };
}
interface RevealedPayload {
  results: AggregatedResult;
}
interface CountPayload {
  count: number;
}

const ACCENT = '#00E5A0';
const ACCENT_BLUE = '#0EA5E9';
const BG = '#0D1117';
const SURFACE = '#161B22';

export default function PresenterPage() {
  const { code } = useParams<{ code: string }>();

  const [session, setSession] = useState<ISession | null>(null);
  const [state, setState] = useState<PresenterState>('waiting');
  const [question, setQuestion] = useState<OpenedPayload['question'] | null>(null);
  const [responseCount, setResponseCount] = useState(0);
  const [results, setResults] = useState<AggregatedResult | null>(null);
  const [joinUrl, setJoinUrl] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/sessions/${code}`);
    if (!res.ok) return;
    const data = await res.json();
    setSession(data.session);

    const openQ = (data.questions as IQuestion[]).find((q) => q.status === 'open');
    const revealedQ = (data.questions as IQuestion[]).find((q) => q.status === 'revealed');

    if (openQ) {
      setQuestion({ id: String(openQ._id), text: openQ.text, choices: openQ.choices, type: openQ.type });
      setState('open');
    } else if (revealedQ) {
      setQuestion({ id: String(revealedQ._id), text: revealedQ.text, choices: revealedQ.choices, type: revealedQ.type });
      setState('revealed');
    }
  }, [code]);

  useEffect(() => {
    load();
    setJoinUrl(`${window.location.origin}/session/${code}`);
  }, [load, code]);

  useEffect(() => {
    const client = getPusherClient();
    const channel = client.subscribe(`session-${code.toUpperCase()}`);

    channel.bind('question:opened', (data: OpenedPayload) => {
      setQuestion(data.question);
      setResponseCount(0);
      setResults(null);
      setState('open');
    });

    channel.bind('question:revealed', (data: RevealedPayload) => {
      setResults(data.results);
      setState('revealed');
    });

    channel.bind('question:closed', () => {
      setState('waiting');
      setQuestion(null);
      setResults(null);
      setResponseCount(0);
    });

    channel.bind('response:count', (data: CountPayload) => {
      setResponseCount(data.count);
    });

    return () => {
      channel.unbind_all();
      client.unsubscribe(`session-${code.toUpperCase()}`);
    };
  }, [code]);

  const chartData = results
    ? Object.entries(results).map(([label, { count, percent }]) => ({ label, count, percent }))
    : [];

  const wordcloudData = results
    ? Object.entries(results).map(([text, { count }]) => ({ text, value: count }))
    : [];

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-12"
      style={{ backgroundColor: BG }}
    >
      {/* WAITING */}
      {state === 'waiting' && (
        <div className="flex flex-col items-center gap-10">
          <div className="text-center">
            <p className="text-sm font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--color-text-muted)' }}>
              Rejoins la session
            </p>
            <div
              className="text-8xl font-black tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: ACCENT }}
            >
              {session?.code ?? code.toUpperCase()}
            </div>
            <p className="text-lg mt-3" style={{ color: 'var(--color-text-secondary)' }}>
              {session?.name}
            </p>
          </div>

          {joinUrl && (
            <div
              className="p-5 rounded-2xl"
              style={{ backgroundColor: '#ffffff' }}
            >
              <QRCodeSVG value={joinUrl} size={180} />
            </div>
          )}

          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            En attente du formateur…
          </p>
        </div>
      )}

      {/* OPEN */}
      {state === 'open' && question && (
        <div className="w-full max-w-3xl flex flex-col items-center gap-12">
          <p
            className="text-5xl font-bold text-center leading-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            {question.text}
          </p>

          {question.type === 'mcq' && (
            <div className="flex flex-wrap gap-4 justify-center">
              {question.choices.map((choice) => (
                <div
                  key={choice}
                  className="px-6 py-3 rounded-xl text-xl font-medium"
                  style={{ backgroundColor: SURFACE, border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                >
                  {choice}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col items-center gap-2">
            <span
              className="text-7xl font-black"
              style={{ fontFamily: 'var(--font-mono)', color: ACCENT }}
            >
              {responseCount}
            </span>
            <span className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
              {responseCount === 1 ? 'réponse' : 'réponses'}
            </span>
          </div>
        </div>
      )}

      {/* REVEALED */}
      {state === 'revealed' && question && results && (
        <div className="w-full max-w-4xl flex flex-col items-center gap-10">
          <p
            className="text-4xl font-bold text-center leading-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            {question.text}
          </p>

          {question.type === 'mcq' && chartData.length > 0 && (
            <div className="w-full" style={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 60 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={160}
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 18 }}
                  />
                  <Bar dataKey="percent" radius={[0, 8, 8, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.label}
                        fill={index === 0 ? ACCENT : index === 1 ? ACCENT_BLUE : 'var(--color-bg-elevated)'}
                      />
                    ))}
                    <LabelList
                      dataKey="percent"
                      position="right"
                      formatter={(v: unknown) => `${v}%`}
                      style={{ fill: 'var(--color-text-primary)', fontSize: 18, fontWeight: 'bold' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {question.type === 'wordcloud' && wordcloudData.length > 0 && (
            <div className="w-full" style={{ height: 400 }}>
              <WordCloud
                words={wordcloudData}
                options={{
                  colors: [ACCENT, ACCENT_BLUE, '#F0F6FC', '#8B949E'],
                  fontFamily: 'Inter, sans-serif',
                  fontSizes: [24, 80],
                  rotations: 0,
                  enableTooltip: false,
                }}
              />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
