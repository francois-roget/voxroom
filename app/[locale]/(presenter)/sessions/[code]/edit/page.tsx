"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { IQuestion, ISession } from "@/types";

type QuestionType = "mcq" | "wordcloud";

export default function EditSessionPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const t = useTranslations("sessions.edit");

  const [session, setSession] = useState<ISession | null>(null);
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New question form state
  const [addingType, setAddingType] = useState<QuestionType>("mcq");
  const [newText, setNewText] = useState("");
  const [newChoices, setNewChoices] = useState(["", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/sessions/${code}`);
        if (!res.ok) {
          setError(t("sessionNotFound"));
          return;
        }
        const data = await res.json();
        setSession(data.session);
        setQuestions(data.questions);
      } catch {
        setError(t("loadingError"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [code, t]);

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setFormError("");

    const choices = newChoices.map((c) => c.trim()).filter(Boolean);
    if (addingType === "mcq" && choices.length < 2) {
      setFormError(t("minChoicesError"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: String(session._id),
          type: addingType,
          text: newText.trim(),
          choices: addingType === "mcq" ? choices : [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error ?? t("createError"));
        return;
      }

      const created = await res.json();
      setQuestions((prev) => [...prev, created]);
      setNewText("");
      setNewChoices(["", "", "", ""]);
    } catch {
      setFormError(t("networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/questions/${id}`, { method: "DELETE" });
      setQuestions((prev) => prev.filter((q) => String(q._id) !== id));
    } catch {
      // silent
    } finally {
      setConfirmDeleteId(null);
    }
  }

  if (loading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg-base)" }}
      >
        <p style={{ color: "var(--color-text-secondary)" }}>{t("loading")}</p>
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
          {error || t("sessionNotFound")}
        </p>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen p-8"
      style={{ backgroundColor: "var(--color-bg-base)" }}
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-text-primary)",
              }}
            >
              {session.name}
            </h1>
            <span
              className="text-sm font-bold tracking-widest"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--color-accent)",
              }}
            >
              {session.code}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/sessions/${code}/control`)}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "#0D1117",
              }}
            >
              {t("controlButton")}
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              {t("dashboardButton")}
            </button>
          </div>
        </div>

        {/* Questions list */}
        <div className="flex flex-col gap-3">
          {questions.length === 0 && (
            <div
              className="rounded-xl p-8 text-center"
              style={{
                backgroundColor: "var(--color-bg-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <p style={{ color: "var(--color-text-secondary)" }}>
                {t("noQuestions")}
              </p>
            </div>
          )}
          {questions.map((q, i) => (
            <div
              key={String(q._id)}
              className="rounded-xl p-4 flex items-start justify-between gap-4"
              style={{
                backgroundColor: "var(--color-bg-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex gap-3 items-start">
                <span
                  className="text-xs font-bold mt-0.5 w-5 text-right shrink-0"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {q.text}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {q.type === "mcq"
                      ? t("mcqLabel", { choices: q.choices.join(", ") })
                      : t("wordcloudLabel")}
                  </span>
                </div>
              </div>
              {confirmDeleteId === String(q._id) ? (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleDelete(String(q._id))}
                    className="text-xs px-3 py-1 rounded-lg font-medium"
                    style={{ backgroundColor: "var(--color-error)", color: "#fff" }}
                  >
                    {t("confirm")}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs px-3 py-1 rounded-lg"
                    style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                  >
                    {t("cancel")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(String(q._id))}
                  className="text-xs px-3 py-1 rounded-lg shrink-0"
                  style={{
                    color: "var(--color-error)",
                    border: "1px solid var(--color-error)",
                  }}
                >
                  {t("delete")}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add question form */}
        <div
          className="rounded-xl p-6 flex flex-col gap-5"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <h2
            className="text-base font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {t("addTitle")}
          </h2>

          {/* Type selector */}
          <div className="flex gap-2">
            {(["mcq", "wordcloud"] as QuestionType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setAddingType(type)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={
                  addingType === type
                    ? {
                        backgroundColor: "var(--color-accent)",
                        color: "#0D1117",
                      }
                    : {
                        backgroundColor: "var(--color-bg-elevated)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-secondary)",
                      }
                }
              >
                {type === "mcq" ? t("typeMcq") : t("typeWordcloud")}
              </button>
            ))}
          </div>

          <form onSubmit={handleAddQuestion} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t("questionLabel")}
              </label>
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder={t("questionPlaceholder")}
                required
                className="rounded-lg px-4 py-3 text-sm outline-none"
                style={{
                  backgroundColor: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>

            {addingType === "mcq" && (
              <div className="flex flex-col gap-2">
                <label
                  className="text-sm font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t("choicesLabel")}
                </label>
                {newChoices.map((c, i) => (
                  <input
                    key={i}
                    type="text"
                    value={c}
                    onChange={(e) => {
                      const updated = [...newChoices];
                      updated[i] = e.target.value;
                      setNewChoices(updated);
                    }}
                    placeholder={t("choicePlaceholder", { number: i + 1 })}
                    className="rounded-lg px-4 py-2 text-sm outline-none"
                    style={{
                      backgroundColor: "var(--color-bg-elevated)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                ))}
              </div>
            )}

            {formError && (
              <p className="text-sm" style={{ color: "var(--color-error)" }}>
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !newText.trim()}
              className="rounded-lg px-4 py-3 text-sm font-medium disabled:opacity-50"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "#0D1117",
              }}
            >
              {submitting ? t("addingButton") : t("addButton")}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
