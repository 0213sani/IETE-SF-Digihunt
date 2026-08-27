"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTeamSocket } from "@/hooks/useTeamSocket";
import {
  ApiError,
  answerQuestion,
  claimQuestion,
  getIncident,
  getMe,
  getRound2Board,
  getStoredToken,
  releaseQuestion,
  type IncidentOut,
  type QuestionBoardItem,
  type Round2BoardOut,
} from "@/lib/api";

// The 4s poll stays as a safety-net fallback; the WebSocket push (G10) makes
// board updates near-instant by triggering an extra fetch on top of it.
const POLL_MS = 4000;
const BOARD_EVENTS = new Set([
  "question_claimed",
  "question_released",
  "question_solved",
  "round_progress_updated",
  "round_unlocked",
]);

const CATEGORY_LABEL: Record<string, string> = {
  who: "WHO",
  what: "WHAT",
  when: "WHEN",
  how: "HOW",
  why: "WHY",
};

function StatusBadge({ status }: { status: QuestionBoardItem["status"] }) {
  if (status === "solved") return <Badge className="font-mono-data">SOLVED</Badge>;
  if (status === "claimed")
    return (
      <Badge variant="outline" className="font-mono-data text-secondary">
        CLAIMED
      </Badge>
    );
  return (
    <Badge variant="outline" className="font-mono-data">
      AVAILABLE
    </Badge>
  );
}

export default function Round2Page() {
  const router = useRouter();
  const [board, setBoard] = useState<Round2BoardOut | null>(null);
  const [incident, setIncident] = useState<IncidentOut | null>(null);
  const [meName, setMeName] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<
    Record<string, { correct: boolean; message: string }>
  >({});

  const fetchBoard = useCallback(async () => {
    try {
      const data = await getRound2Board();
      setBoard(data);
      setLocked(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setLocked(true);
        return;
      }
      setError(err instanceof ApiError ? err.message : "Failed to load board.");
    }
  }, [router]);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace("/login");
      return;
    }
    getMe()
      .then((me) => setMeName(me.name))
      .catch(() => {});
    getIncident()
      .then(setIncident)
      .catch(() => {});
    fetchBoard();

    const interval = setInterval(fetchBoard, POLL_MS);
    return () => clearInterval(interval);
  }, [router, fetchBoard]);

  useTeamSocket(
    useCallback(
      (event) => {
        if (BOARD_EVENTS.has(event.type)) fetchBoard();
      },
      [fetchBoard]
    )
  );

  async function handleClaim(id: string) {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await claimQuestion(id);
      await fetchBoard();
    } catch (err) {
      setFeedback((f) => ({
        ...f,
        [id]: {
          correct: false,
          message:
            err instanceof ApiError ? err.message : "Could not claim clue.",
        },
      }));
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  async function handleRelease(id: string) {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await releaseQuestion(id);
      setSelected((s) => ({ ...s, [id]: "" }));
      await fetchBoard();
    } catch (err) {
      setFeedback((f) => ({
        ...f,
        [id]: {
          correct: false,
          message: err instanceof ApiError ? err.message : "Could not release clue.",
        },
      }));
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  async function handleSubmit(id: string) {
    const answer = selected[id];
    if (!answer) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const result = await answerQuestion(id, answer);
      setFeedback((f) => ({
        ...f,
        [id]: { correct: result.correct, message: result.message },
      }));
      await fetchBoard();
    } catch (err) {
      setFeedback((f) => ({
        ...f,
        [id]: {
          correct: false,
          message: err instanceof ApiError ? err.message : "Submission failed.",
        },
      }));
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  if (locked) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="glow-cyan font-mono-data text-xl font-bold text-primary">
          ROUND LOCKED
        </p>
        <p className="font-mono-data text-sm text-muted-foreground">
          Complete the previous mission objective to unlock this round.
        </p>
        <Button
          variant="outline"
          className="font-mono-data"
          onClick={() => router.push("/round1")}
        >
          BACK TO ROUND 1
        </Button>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 font-mono-data text-sm text-destructive">
          {error}
        </p>
      </main>
    );
  }

  if (!board) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="font-mono-data text-sm text-muted-foreground">
          LOADING THE CASE FILE...
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="glow-cyan font-mono-data text-2xl font-bold text-primary sm:text-3xl">
          ROUND 2 // DIGITAL DETECTIVES
        </h1>
        <Button
          variant="outline"
          className="font-mono-data"
          onClick={() => router.push("/dashboard")}
        >
          MISSION CONTROL
        </Button>
      </div>

      {incident && (
        <section className="grid gap-4">
          <Card className="glow-border">
            <CardHeader>
              <CardTitle className="font-mono-data text-sm text-secondary">
                SERVER LOG
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-black/40 p-3 font-mono-data text-xs text-primary">
                {incident.server_log
                  .map((l) => `[${l.time}] ${l.event}`)
                  .join("\n")}
              </pre>
            </CardContent>
          </Card>

          <Card className="glow-border">
            <CardHeader>
              <CardTitle className="font-mono-data text-sm text-secondary">
                SUSPICIOUS EMAIL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 font-mono-data text-xs text-foreground">
              <p>
                <span className="text-muted-foreground">From:</span>{" "}
                {incident.suspicious_email.from}
              </p>
              <p>
                <span className="text-muted-foreground">Subject:</span>{" "}
                {incident.suspicious_email.subject}
              </p>
              <p className="pt-2 text-foreground/90">{incident.suspicious_email.body}</p>
            </CardContent>
          </Card>

          <Card className="glow-border">
            <CardHeader>
              <CardTitle className="font-mono-data text-sm text-secondary">
                USER ACTIVITY
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono-data text-xs text-foreground">
                {incident.user_activity}
              </p>
            </CardContent>
          </Card>

          <Card className="glow-border">
            <CardHeader>
              <CardTitle className="font-mono-data text-sm text-secondary">
                CODE SNIPPET
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-md border border-border bg-black/40 p-3 font-mono-data text-xs text-primary">
                {incident.code_snippet}
              </pre>
            </CardContent>
          </Card>

          <Card className="glow-border">
            <CardHeader>
              <CardTitle className="font-mono-data text-sm text-secondary">
                TIMELINE
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono-data text-xs text-foreground">{incident.timeline}</p>
            </CardContent>
          </Card>
        </section>
      )}

      {board.investigation_complete && board.summary && (
        <Card className="glow-border border-primary">
          <CardHeader className="text-center">
            <CardTitle className="glow-cyan font-mono-data text-lg text-primary">
              INVESTIGATION COMPLETE — ROUND 3 UNLOCKED
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 font-mono-data text-sm text-foreground">
            {Object.entries(board.summary).map(([category, answer]) => (
              <p key={category}>
                <span className="text-secondary">
                  {CATEGORY_LABEL[category] ?? category.toUpperCase()}:
                </span>{" "}
                {answer}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4">
        {board.questions.map((q) => {
          const isMine = q.status !== "available" && q.claimed_by_name === meName;
          const fb = feedback[q.team_question_id];
          const isBusy = !!busy[q.team_question_id];

          return (
            <Card
              key={q.team_question_id}
              className={q.status === "solved" ? "opacity-80" : "glow-border"}
            >
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="font-mono-data text-sm text-secondary">
                    {CATEGORY_LABEL[q.category] ?? q.category.toUpperCase()}{" "}
                    <span className="text-muted-foreground">· {q.difficulty}</span>
                  </CardTitle>
                  <StatusBadge status={q.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {q.status === "solved" && (
                  <p className="font-mono-data text-sm text-foreground">
                    ✓ Solved by {q.claimed_by_name ?? "a teammate"}
                  </p>
                )}

                {q.status === "claimed" && !isMine && (
                  <p className="font-mono-data text-sm text-muted-foreground">
                    Being solved by {q.claimed_by_name ?? "a teammate"}...
                  </p>
                )}

                {q.status === "available" && (
                  <Button
                    className="font-mono-data"
                    disabled={isBusy}
                    onClick={() => handleClaim(q.team_question_id)}
                  >
                    {isBusy ? "CLAIMING..." : "CLAIM"}
                  </Button>
                )}

                {q.status === "claimed" && isMine && (
                  <div className="space-y-3">
                    <p className="font-mono-data text-sm text-foreground">
                      {q.question_text}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(q.options ?? []).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          aria-pressed={selected[q.team_question_id] === opt}
                          onClick={() =>
                            setSelected((s) => ({ ...s, [q.team_question_id]: opt }))
                          }
                          className={`rounded-md border px-3 py-2 text-left font-mono-data text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                            selected[q.team_question_id] === opt
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-foreground hover:border-secondary"
                          }`}
                        >
                          {selected[q.team_question_id] === opt ? "✓ " : ""}
                          {opt}
                        </button>
                      ))}
                    </div>

                    {fb && (
                      <p
                        className={`rounded-md border px-4 py-2 font-mono-data text-sm ${
                          fb.correct
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-destructive/40 bg-destructive/10 text-destructive"
                        }`}
                      >
                        {fb.correct
                          ? `ACCESS GRANTED — ${fb.message}`
                          : "ACCESS DENIED — Incorrect response. Try again."}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        className="font-mono-data"
                        disabled={isBusy || !selected[q.team_question_id]}
                        onClick={() => handleSubmit(q.team_question_id)}
                      >
                        {isBusy ? "SUBMITTING..." : "SUBMIT"}
                      </Button>
                      <Button
                        variant="outline"
                        className="font-mono-data"
                        disabled={isBusy}
                        onClick={() => handleRelease(q.team_question_id)}
                      >
                        RELEASE
                      </Button>
                    </div>
                  </div>
                )}

                {fb && q.status !== "claimed" && (
                  <p
                    className={`rounded-md border px-4 py-2 font-mono-data text-sm ${
                      fb.correct
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-destructive/40 bg-destructive/10 text-destructive"
                    }`}
                  >
                    {fb.message}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
