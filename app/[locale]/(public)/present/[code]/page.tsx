"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { useTranslations } from "next-intl";
import { usePusherChannel } from "@/hooks/usePusherChannel";
import PokerPresenter from "@/components/poker/PokerPresenter";
import type { IQuestion, ISession, AggregatedResult, PokerParticipantSummary, PokerVote } from "@/types";

type PresenterState = "waiting" | "open" | "revealed";

interface OpenedPayload {
  question: { _id: string; text: string; choices: string[]; type: string };
  responseCount: number;
}
interface RevealedPayload {
  results: AggregatedResult;
}

const ACCENT = "#00E5A0";
const ACCENT_BLUE = "#0EA5E9";
const BG = "#0D1117";
const SURFACE = "#161B22";

export default function PresenterPage() {
  const { code } = useParams<{ code: string }>();
  const t = useTranslations("present");

  const [session, setSession] = useState<ISession | null>(null);
  const [state, setState] = useState<PresenterState>("waiting");
  const [question, setQuestion] = useState<OpenedPayload["question"] | null>(
    null,
  );
  const [responseCount, setResponseCount] = useState(0);
  const [results, setResults] = useState<AggregatedResult | null>(null);
  const [joinUrl, setJoinUrl] = useState("");

  // Poker state
  const [pokerParticipants, setPokerParticipants] = useState<PokerParticipantSummary[]>([]);
  const [pokerVotes, setPokerVotes] = useState<PokerVote[]>([]);
  const [pokerStory, setPokerStory] = useState<{ id: string; text: string; jiraUrl: string | null; status: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/sessions/${code}`);
    if (!res.ok) return;
    const data = await res.json() as {
      session: ISession;
      questions: IQuestion[];
      responseCount: number;
      participants: PokerParticipantSummary[];
    };
    setSession(data.session);

    if (data.session.kind === 'poker') {
      setPokerParticipants(data.participants ?? []);
      const openQ = data.questions.find((q) => q.status === 'open') ?? null;
      const revealedQ = data.questions.find((q) => q.status === 'revealed') ?? null;
      const activeQ = openQ ?? revealedQ;
      if (activeQ) {
        setPokerStory({
          id: String(activeQ._id),
          text: activeQ.text,
          jiraUrl: activeQ.storyMeta?.jiraUrl ?? null,
          status: activeQ.status,
        });
      }
      return;
    }

    setResponseCount(data.responseCount ?? 0);

    const openQ = data.questions.find(
      (q) => q.status === "open",
    );
    const revealedQ = data.questions.find(
      (q) => q.status === "revealed",
    );

    if (openQ) {
      setQuestion({
        _id: String(openQ._id),
        text: openQ.text,
        choices: openQ.choices,
        type: openQ.type,
      });
      setState("open");
    } else if (revealedQ) {
      setQuestion({
        _id: String(revealedQ._id),
        text: revealedQ.text,
        choices: revealedQ.choices,
        type: revealedQ.type,
      });
      setState("revealed");
    }
  }, [code]);

  useEffect(() => {
    load();
    setJoinUrl(`${window.location.origin}/session/${code}`);
  }, [load, code]);

  usePusherChannel(`session-${code.toUpperCase()}`, {
    'question:opened': (data) => {
      const payload = data as OpenedPayload;
      setQuestion(payload.question);
      setResponseCount(payload.responseCount ?? 0);
      setResults(null);
      setState("open");
    },
    'question:revealed': (data) => {
      const payload = data as RevealedPayload;
      setResults(payload.results);
      setState("revealed");
    },
    'question:closed': (_data) => {
      setState("waiting");
      setQuestion(null);
      setResults(null);
      setResponseCount(0);
    },
  });

  const chartData = results
    ? Object.entries(results).map(([label, { count, percent }]) => ({
        label,
        count,
        percent,
      }))
    : [];

  const wordcloudData = results
    ? Object.entries(results).map(([text, { count }]) => ({
        text,
        value: count,
      }))
    : [];

  // Poker render branch
  if (session?.kind === 'poker') {
    return (
      <PokerPresenter
        code={code.toUpperCase()}
        sessionName={session.name}
        initialStory={pokerStory}
        initialParticipants={pokerParticipants}
        initialVotes={pokerVotes}
      />
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-12"
      style={{ backgroundColor: BG }}
    >
      {/* WAITING */}
      {state === "waiting" && (
        <div key="state-waiting" className="flex flex-col items-center gap-10" style={{ animation: 'var(--animate-fade-in-up)' }}>
          <div className="text-center">
            <p
              className="text-sm font-medium tracking-widest uppercase mb-3"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("joinSession")}
            </p>
            <div
              className="text-8xl font-black tracking-widest"
              style={{ fontFamily: "var(--font-mono)", color: ACCENT }}
            >
              {session?.code ?? code.toUpperCase()}
            </div>
            <p
              className="text-lg mt-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {session?.name}
            </p>
          </div>

          {joinUrl && (
            <div
              className="p-5 rounded-2xl"
              style={{ backgroundColor: "#ffffff" }}
            >
              <QRCodeSVG value={joinUrl} size={180} />
            </div>
          )}

          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t("waitingForPresenter")}
          </p>
        </div>
      )}

      {/* OPEN */}
      {state === "open" && question && (
        <div key={`state-open-${question._id}`} className="w-full max-w-3xl flex flex-col items-center gap-12" style={{ animation: 'var(--animate-fade-in-up)' }}>
          <p
            className="text-5xl font-bold text-center leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-primary)",
            }}
          >
            {question.text}
          </p>

          {question.type === "mcq" && (
            <div className="flex flex-wrap gap-4 justify-center">
              {question.choices.map((choice) => (
                <div
                  key={choice}
                  className="px-6 py-3 rounded-xl text-xl font-medium"
                  style={{
                    backgroundColor: SURFACE,
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {choice}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col items-center gap-2">
            <span
              key={responseCount}
              className="text-7xl font-black"
              style={{ fontFamily: "var(--font-mono)", color: ACCENT, animation: 'var(--animate-pulse-counter)' }}
            >
              {responseCount}
            </span>
            <span
              className="text-lg"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t("responseCount", { count: responseCount })}
            </span>
          </div>
        </div>
      )}

      {/* REVEALED */}
      {state === "revealed" && question && results && (
        <div key={`state-revealed-${question._id}`} className="w-full max-w-4xl flex flex-col items-center gap-10" style={{ animation: 'var(--animate-fade-in-up)' }}>
          <p
            className="text-4xl font-bold text-center leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-primary)",
            }}
          >
            {question.text}
          </p>

          {question.type === "mcq" && chartData.length > 0 && (
            <div className="w-full">
              <ResponsiveContainer width="100%" height={360}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 20, right: 60 }}
                >
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={160}
                    tick={{ fill: "var(--color-text-secondary)", fontSize: 18 }}
                  />
                  <Bar dataKey="percent" radius={[0, 8, 8, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.label}
                        fill={
                          index === 0
                            ? ACCENT
                            : index === 1
                              ? ACCENT_BLUE
                              : "var(--color-bg-elevated)"
                        }
                      />
                    ))}
                    <LabelList
                      dataKey="percent"
                      position="right"
                      formatter={(v: unknown) => `${v}%`}
                      style={{
                        fill: "var(--color-text-primary)",
                        fontSize: 18,
                        fontWeight: "bold",
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {question.type === "wordcloud" &&
            wordcloudData.length > 0 &&
            (() => {
              const max = Math.max(...wordcloudData.map((w) => w.value));
              const colors = [ACCENT, ACCENT_BLUE, "#F0F6FC", "#8B949E"];
              return (
                <div
                  className="w-full flex flex-wrap gap-4 justify-center items-center"
                  style={{ minHeight: 300 }}
                >
                  {wordcloudData
                    .sort((a, b) => b.value - a.value)
                    .map((w, i) => {
                      const size = Math.round(24 + (w.value / max) * 56);
                      return (
                        <span
                          key={w.text}
                          style={{
                            fontSize: size,
                            fontWeight: 700,
                            color: colors[i % colors.length],
                            lineHeight: 1.2,
                            fontFamily: "var(--font-display)",
                          }}
                        >
                          {w.text}
                        </span>
                      );
                    })}
                </div>
              );
            })()}
        </div>
      )}
    </main>
  );
}
