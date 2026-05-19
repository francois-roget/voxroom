"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  getOrCreateParticipantId,
  hasAnswered,
  markAnswered,
  getParticipantName,
  clearAnswered,
} from "@/lib/localStorage";
import { usePusherChannel } from "@/hooks/usePusherChannel";
import LoadingScreen from "@/components/shared/LoadingScreen";
import ErrorCard from "@/components/shared/ErrorCard";
import PokerJoinForm from "@/components/poker/PokerJoinForm";
import PokerDeck from "@/components/poker/PokerDeck";
import type { IQuestion, ISession, PokerVote } from "@/types";

const API_ERROR_KEYS: Record<string, string> = {
  "Question is not open": "errors.questionNotOpen",
  "Question not found": "errors.questionNotFound",
  "Already answered": "errors.alreadyAnswered",
  "Session not found": "errors.sessionNotFound",
};

export default function SessionPage() {
  const { code } = useParams<{ code: string }>();
  const t = useTranslations("session");
  const tPoker = useTranslations("poker");

  const [session, setSession] = useState<ISession | null>(null);
  const [openQuestion, setOpenQuestion] = useState<IQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionClosed, setSessionClosed] = useState(false);

  // Poll state
  const [selected, setSelected] = useState("");
  const [wordInput, setWordInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Poker state
  const [pokerName, setPokerName] = useState<string | null>(null);
  const [pokerParticipant, setPokerParticipant] = useState<{
    participantId: string;
    name: string;
    color: string;
  } | null>(null);
  type PokerPhase = 'waiting' | 'open' | 'revealed';
  const [pokerPhase, setPokerPhase] = useState<PokerPhase>('waiting');
  const [pokerStory, setPokerStory] = useState<{
    id: string;
    text: string;
    jiraUrl: string | null;
  } | null>(null);
  const [pokerHasVoted, setPokerHasVoted] = useState(false);
  const [pokerVotes, setPokerVotes] = useState<PokerVote[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${code}`);
      if (!res.ok) {
        setError(t("errors.sessionNotFound"));
        return;
      }
      const data = await res.json() as {
        session: ISession;
        questions: IQuestion[];
        responseCount: number;
      };
      setSession(data.session);

      if (data.session.status === "closed") {
        setSessionClosed(true);
        return;
      }

      // Poker session setup
      if (data.session.kind === 'poker') {
        const storedName = getParticipantName(code);
        setPokerName(storedName);
        if (storedName) {
          const pid = getOrCreateParticipantId();
          setPokerParticipant({ participantId: pid, name: storedName, color: '#888888' });
        }
        // Determine current story phase
        const openQ = data.questions.find((q) => q.status === 'open') ?? null;
        const revealedQ = data.questions.find((q) => q.status === 'revealed') ?? null;
        const activeQ = openQ ?? revealedQ;
        if (openQ) {
          setPokerPhase('open');
          setPokerStory({
            id: String(openQ._id),
            text: openQ.text,
            jiraUrl: openQ.storyMeta?.jiraUrl ?? null,
          });
          setPokerHasVoted(hasAnswered(String(openQ._id)));
        } else if (revealedQ) {
          setPokerPhase('revealed');
          setPokerStory({
            id: String(revealedQ._id),
            text: revealedQ.text,
            jiraUrl: revealedQ.storyMeta?.jiraUrl ?? null,
          });
        }
        void activeQ; // suppress unused var warning
        return;
      }

      const open = data.questions.find((q) => q.status === "open") ?? null;
      setOpenQuestion(open);
      const alreadyAnsweredQuestion = !!(open && hasAnswered(String(open._id)));
      setAlreadyAnswered(alreadyAnsweredQuestion);
      if (!alreadyAnsweredQuestion) {
        setAnswered(false);
      }
    } catch {
      setError(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }, [code, t]);

  useEffect(() => {
    load();
  }, [load]);

  usePusherChannel(`session-${code.toUpperCase()}`, {
    'question:opened': (data) => {
      const payload = data as { question: IQuestion };
      const q = payload.question as unknown as IQuestion;
      setOpenQuestion(q);
      if (hasAnswered(String(q._id))) {
        setAlreadyAnswered(true);
        setAnswered(false);
      } else {
        setAlreadyAnswered(false);
        setAnswered(false);
        setSelected('');
        setWordInput('');
      }
    },
    'question:closed': (_data) => {
      setOpenQuestion(null);
      setAnswered(false);
      setAlreadyAnswered(false);
    },
    'session:closed': (_data) => {
      setSessionClosed(true);
    },
    'story:opened': (data) => {
      const payload = data as { story: { id: string; text: string; jiraUrl: string | null } };
      setPokerStory(payload.story);
      setPokerPhase('open');
      setPokerHasVoted(false);
      setPokerVotes([]);
    },
    'story:revealed': (data) => {
      const payload = data as { votes: PokerVote[] };
      setPokerPhase('revealed');
      setPokerVotes(payload.votes);
    },
    'story:closed': () => {
      setPokerPhase('waiting');
      setPokerStory(null);
    },
    'story:reset': (data) => {
      const payload = data as { storyId: string };
      if (pokerStory && payload.storyId === pokerStory.id) {
        clearAnswered(pokerStory.id);
      }
      setPokerPhase('open');
      setPokerHasVoted(false);
      setPokerVotes([]);
    },
    'vote:cast': (data) => {
      const payload = data as { participantId: string | null };
      if (payload.participantId === null) {
        setPokerHasVoted(false);
      }
    },
  });

  function handlePokerJoined(participant: { participantId: string; name: string; color: string }) {
    setPokerParticipant(participant);
    setPokerName(participant.name);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!openQuestion || !session) return;

    const value = openQuestion.type === "mcq" ? selected : wordInput.trim();
    if (!value) return;

    setSubmitting(true);
    setSubmitError("");

    const participantId = getOrCreateParticipantId();

    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: String(openQuestion._id),
          sessionId: String(session._id),
          participantId,
          value,
        }),
      });

      if (res.status === 409) {
        markAnswered(String(openQuestion._id));
        setAlreadyAnswered(true);
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        const rawError = data.error ?? "";
        const key = API_ERROR_KEYS[rawError];
        setSubmitError(key ? t(key as Parameters<typeof t>[0]) : (rawError || t("errors.generic")));
        return;
      }

      markAnswered(String(openQuestion._id));
      setAnswered(true);
    } catch {
      setSubmitError(t("errors.submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingScreen />;

  if (error || !session) {
    return <ErrorCard message={error || t("errors.sessionNotFound")} href="/join" linkText={t("joinSession")} />;
  }

  // Poker session rendering
  if (session.kind === 'poker') {
    if (!pokerName) {
      return (
        <PokerJoinForm
          sessionCode={code}
          onJoined={handlePokerJoined}
        />
      );
    }

    const pid = pokerParticipant?.participantId ?? getOrCreateParticipantId();

    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: 'var(--color-bg-base)' }}
      >
        {pokerPhase === 'waiting' && (
          <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            {tPoker('waitingStory')}
          </p>
        )}

        {pokerPhase === 'open' && pokerStory && !pokerHasVoted && (
          <PokerDeck
            questionId={pokerStory.id}
            sessionId={String(session._id)}
            participantId={pid}
            participantName={pokerParticipant?.name ?? pokerName}
            onVoted={() => setPokerHasVoted(true)}
          />
        )}

        {pokerPhase === 'open' && pokerHasVoted && (
          <div className="text-center flex flex-col gap-3">
            <p className="text-lg font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {tPoker('voteSubmitted')}
            </p>
          </div>
        )}

        {pokerPhase === 'revealed' && (
          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {tPoker('revealTitle')}
            </p>
            <div className="grid grid-cols-3 gap-3 w-full">
              {pokerVotes.map((vote) => (
                <div
                  key={vote.participantId}
                  className="rounded-xl flex flex-col items-center justify-center p-3 aspect-[2/3]"
                  style={{
                    backgroundColor: vote.color + '33',
                    borderColor: vote.color,
                    borderWidth: 2,
                    borderStyle: 'solid',
                  }}
                >
                  <span className="text-3xl font-black" style={{ color: vote.color }}>
                    {vote.value}
                  </span>
                  <span className="text-xs mt-1 truncate w-full text-center" style={{ color: vote.color }}>
                    {vote.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    );
  }

  if (sessionClosed) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: "var(--color-bg-base)" }}
      >
        <div
          className="w-full max-w-sm rounded-xl p-8 flex flex-col items-center gap-4 text-center"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <span className="text-3xl">✓</span>
          <p
            className="font-medium"
            style={{ color: "var(--color-text-primary)" }}
          >
            {t("sessionClosed")}
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {t("thankYou")}
          </p>
          <Link
            href="/join"
            className="rounded-lg px-4 py-2 text-sm font-medium mt-2"
            style={{
              backgroundColor: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            {t("joinAnother")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: "var(--color-bg-base)" }}
    >
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Session name */}
        <div className="text-center">
          <p
            className="text-xs font-bold tracking-widest"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-accent)",
            }}
          >
            {session.code}
          </p>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {session.name}
          </p>
        </div>

        {/* No open question */}
        {!openQuestion && (
          <div
            className="rounded-xl p-8 text-center"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t("waitingForQuestion")}
            </p>
            <button
              onClick={load}
              className="mt-4 text-xs px-4 py-3 rounded-lg min-h-[44px]"
              style={{
                color: "var(--color-text-muted)",
                border: "1px solid var(--color-border)",
              }}
            >
              {t("refresh")}
            </button>
          </div>
        )}

        {/* Answered */}
        {openQuestion && answered && (
          <div
            className="rounded-xl p-8 text-center flex flex-col gap-3"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid var(--color-accent)",
              animation: "var(--animate-pulse-confirm)",
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: "rgba(0,229,160,0.15)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="font-medium" style={{ color: "var(--color-accent)" }}>
              {t("responseSent")}
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t("waitingForResults")}
            </p>
          </div>
        )}

        {/* Already answered (persisted across refresh) */}
        {openQuestion && alreadyAnswered && !answered && (
          <div
            className="rounded-xl p-8 text-center flex flex-col gap-3"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: "var(--color-bg-elevated)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="var(--color-text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p
              className="font-medium"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t("alreadyAnswered")}
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {t("waitingForResults")}
            </p>
          </div>
        )}

        {/* Question form */}
        {openQuestion && !answered && !alreadyAnswered && (
          <div
            className="rounded-xl p-6 flex flex-col gap-5"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p
              className="text-base font-medium leading-snug"
              style={{ color: "var(--color-text-primary)" }}
            >
              {openQuestion.text}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {openQuestion.type === "mcq" && (
                <div className="flex flex-col gap-2">
                  {openQuestion.choices.map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setSelected(choice)}
                      className="rounded-lg px-4 py-3 text-sm font-medium text-left transition-all duration-150 active:scale-[0.97] min-h-[64px]"
                      style={
                        selected === choice
                          ? {
                              backgroundColor: "var(--color-accent)",
                              color: "#0D1117",
                              boxShadow: "0 0 0 2px var(--color-accent)",
                              border: "1px solid transparent",
                            }
                          : {
                              backgroundColor: "var(--color-bg-elevated)",
                              border: "1px solid var(--color-border)",
                              color: "var(--color-text-primary)",
                              boxShadow: "none",
                            }
                      }
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              )}

              {openQuestion.type === "wordcloud" && (
                <input
                  type="text"
                  value={wordInput}
                  onChange={(e) => setWordInput(e.target.value)}
                  placeholder={t("wordPlaceholder")}
                  maxLength={50}
                  required
                  autoComplete="off"
                  inputMode="text"
                  className="rounded-lg px-4 py-3 text-base outline-none"
                  style={{
                    backgroundColor: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                />
              )}

              {submitError && (
                <div
                  className="rounded-lg p-3 text-sm"
                  style={{
                    backgroundColor: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-error)",
                    color: "var(--color-error)",
                  }}
                >
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  (openQuestion.type === "mcq" ? !selected : !wordInput.trim())
                }
                className="rounded-lg px-4 py-3 text-sm font-bold disabled:opacity-50 mt-1 min-h-[56px] transition-transform active:scale-[0.97]"
                style={{
                  backgroundColor: "var(--color-accent)",
                  color: "#0D1117",
                }}
              >
                {submitting ? t("submittingButton") : t("submitButton")}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
