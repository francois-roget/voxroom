"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getPusherClient } from "@/lib/pusher-client";
import type { IQuestion, ISession } from "@/types";

const API_ERROR_MESSAGES: Record<string, string> = {
  "Question is not open": "Cette question n'est plus ouverte.",
  "Question not found": "Question introuvable.",
  "Already answered": "Tu as déjà répondu à cette question.",
  "Session not found": "Session introuvable.",
};

function getOrCreateParticipantId(): string {
  const key = "voxroom_participant_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function hasAnswered(questionId: string): boolean {
  return localStorage.getItem(`voxroom_answered_${questionId}`) === "1";
}

function markAnswered(questionId: string): void {
  localStorage.setItem(`voxroom_answered_${questionId}`, "1");
}

export default function SessionPage() {
  const { code } = useParams<{ code: string }>();

  const [session, setSession] = useState<ISession | null>(null);
  const [openQuestion, setOpenQuestion] = useState<IQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionClosed, setSessionClosed] = useState(false);

  const [selected, setSelected] = useState("");
  const [wordInput, setWordInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${code}`);
      if (!res.ok) {
        setError("Session introuvable.");
        return;
      }
      const data = await res.json();
      setSession(data.session);

      if (data.session.status === "closed") {
        setSessionClosed(true);
        return;
      }

      const open = (data.questions as IQuestion[]).find((q) => q.status === "open") ?? null;
      setOpenQuestion(open);
      const alreadyAnsweredQuestion = !!(open && hasAnswered(String(open._id)));
      setAlreadyAnswered(alreadyAnsweredQuestion);
      if (!alreadyAnsweredQuestion) {
        setAnswered(false);
      }
    } catch {
      setError("Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const client = getPusherClient();
    const channel = client.subscribe(`session-${code.toUpperCase()}`);

    channel.bind("question:opened", (data: { question: IQuestion }) => {
      const q = data.question as unknown as IQuestion;
      setOpenQuestion(q);
      if (hasAnswered(String(q._id))) {
        setAlreadyAnswered(true);
        setAnswered(false);
      } else {
        setAlreadyAnswered(false);
        setAnswered(false);
        setSelected("");
        setWordInput("");
      }
    });

    channel.bind("question:closed", () => {
      setOpenQuestion(null);
      setAnswered(false);
      setAlreadyAnswered(false);
    });

    channel.bind("session:closed", () => {
      setSessionClosed(true);
    });


    return () => {
      channel.unbind_all();
      client.unsubscribe(`session-${code.toUpperCase()}`);
    };
  }, [code]);

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
        setSubmitError(API_ERROR_MESSAGES[rawError] ?? rawError ?? "Erreur lors de la soumission.");
        return;
      }

      markAnswered(String(openQuestion._id));
      setAnswered(true);
    } catch {
      setSubmitError("Impossible d'envoyer la réponse.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg-base)" }}
      >
        <p style={{ color: "var(--color-text-secondary)" }}>Chargement…</p>
      </main>
    );
  }

  if (error || !session) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: "var(--color-bg-base)" }}
      >
        <div
          className="w-full max-w-sm rounded-xl p-8 flex flex-col items-center gap-4 text-center"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-error)",
          }}
        >
          <span className="text-3xl">⚠️</span>
          <p className="font-medium" style={{ color: "var(--color-error)" }}>
            {error || "Session introuvable."}
          </p>
          <Link
            href="/join"
            className="rounded-lg px-4 py-2 text-sm font-medium mt-2"
            style={{ backgroundColor: "var(--color-accent)", color: "#0D1117" }}
          >
            Rejoindre une session
          </Link>
        </div>
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
            Cette session est terminée.
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Merci pour ta participation !
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
            Rejoindre une autre session
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
              En attente d&apos;une question…
            </p>
            <button
              onClick={load}
              className="mt-4 text-xs px-4 py-3 rounded-lg min-h-[44px]"
              style={{
                color: "var(--color-text-muted)",
                border: "1px solid var(--color-border)",
              }}
            >
              Actualiser
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
              Réponse envoyée !
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              En attente des résultats…
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
              Tu as déjà répondu.
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              En attente des résultats…
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
                  placeholder="Ton mot…"
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
                {submitting ? "Envoi…" : "Envoyer"}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
