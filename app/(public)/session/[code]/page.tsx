"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import type { IQuestion, ISession } from "@/types";

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

  const [selected, setSelected] = useState("");
  const [wordInput, setWordInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [answered, setAnswered] = useState(false);
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
      const open =
        (data.questions as IQuestion[]).find((q) => q.status === "open") ??
        null;
      setOpenQuestion(open);
      if (open && hasAnswered(String(open._id))) {
        setAlreadyAnswered(true);
      } else {
        setAlreadyAnswered(false);
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
        setSubmitError(data.error ?? "Erreur lors de la soumission.");
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
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg-base)" }}
      >
        <p style={{ color: "var(--color-error)" }}>
          {error || "Session introuvable."}
        </p>
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
              className="mt-4 text-xs px-4 py-2 rounded-lg"
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
            }}
          >
            <span className="text-3xl">✓</span>
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
            <span className="text-3xl">✓</span>
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

        {/* Already answered (persisted across refresh) */}
        {openQuestion && alreadyAnswered && !answered && (
          <div
            className="rounded-xl p-8 text-center flex flex-col gap-3"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <span className="text-3xl">✓</span>
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

        {/* Already answered (persisted across refresh) */}
        {openQuestion && alreadyAnswered && !answered && (
          <div
            className="rounded-xl p-8 text-center flex flex-col gap-3"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <span className="text-3xl">✓</span>
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
                      className="rounded-lg px-4 py-3 text-sm font-medium text-left transition-colors"
                      style={
                        selected === choice
                          ? {
                              backgroundColor: "var(--color-accent)",
                              color: "#0D1117",
                            }
                          : {
                              backgroundColor: "var(--color-bg-elevated)",
                              border: "1px solid var(--color-border)",
                              color: "var(--color-text-primary)",
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
                  className="rounded-lg px-4 py-3 text-sm outline-none"
                  style={{
                    backgroundColor: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                />
              )}

              {submitError && (
                <p className="text-sm" style={{ color: "var(--color-error)" }}>
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  (openQuestion.type === "mcq" ? !selected : !wordInput.trim())
                }
                className="rounded-lg px-4 py-3 text-sm font-bold disabled:opacity-50 mt-1"
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
