"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  downloadAdminSubmission,
  getAdminTeamDetail,
  getStoredToken,
  redirectOnAdminError,
  resetTeam,
  type AdminTeamDetail,
} from "@/lib/api";

export default function AdminTeamDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const teamId = params.id;

  const [team, setTeam] = useState<AdminTeamDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(() => {
    getAdminTeamDetail(teamId)
      .then(setTeam)
      .catch((err) => {
        const msg = redirectOnAdminError(err, router);
        if (msg) setError(msg);
      });
  }, [teamId, router]);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace("/login");
      return;
    }
    load();
  }, [router, load]);

  async function handleReset() {
    if (
      !window.confirm(
        `Reset all progress for ${team?.team_code}? This deletes questions, attempts, case assignment, and submissions. This cannot be undone.`
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      await resetTeam(teamId);
      load();
    } catch (err) {
      const msg = redirectOnAdminError(err, router);
      if (msg) setError(msg);
    } finally {
      setResetting(false);
    }
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 font-mono-data text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (!team) {
    return (
      <p className="font-mono-data text-sm text-muted-foreground">LOADING TEAM...</p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="glow-cyan font-mono-data text-2xl font-bold text-primary">
            {team.team_code} · {team.team_name}
          </h1>
          <Badge className="mt-2" variant={team.status === "active" ? undefined : "destructive"}>
            {team.status.toUpperCase()}
          </Badge>
        </div>
        <Button
          variant="destructive"
          className="font-mono-data"
          disabled={resetting}
          onClick={handleReset}
        >
          {resetting ? "RESETTING..." : "RESET TEAM PROGRESS"}
        </Button>
      </div>

      <section>
        <h2 className="mb-3 font-mono-data text-sm tracking-widest text-primary">
          MEMBERS
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {team.members.map((m) => (
            <Card key={m.id}>
              <CardContent className="py-4">
                <p className="font-mono-data text-sm text-foreground">{m.name}</p>
                <p className="font-mono-data text-xs text-muted-foreground">{m.email}</p>
                <p className="mt-1 font-mono-data text-[10px] text-muted-foreground">
                  Last login: {m.last_login ? new Date(m.last_login).toLocaleString() : "never"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono-data text-sm tracking-widest text-primary">
          QUESTION HISTORY
        </h2>
        {team.questions.length === 0 ? (
          <p className="font-mono-data text-sm text-muted-foreground">
            No questions assigned yet.
          </p>
        ) : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[700px] text-left font-mono-data text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Round</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Solved By</th>
                    <th className="px-4 py-3">Solved At</th>
                    <th className="px-4 py-3">Wrong Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {team.questions.map((q) => (
                    <tr key={q.team_question_id} className="border-b border-border/50">
                      <td className="px-4 py-3">{q.round}</td>
                      <td className="px-4 py-3">{q.category}</td>
                      <td className="px-4 py-3">
                        <Badge variant={q.status === "solved" ? undefined : "outline"}>
                          {q.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{q.solved_by ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {q.solved_at ? new Date(q.solved_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3">{q.wrong_attempt_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </section>

      {team.round2_investigation_summary && (
        <section>
          <h2 className="mb-3 font-mono-data text-sm tracking-widest text-primary">
            ROUND 2 INVESTIGATION SUMMARY
          </h2>
          <Card>
            <CardContent className="grid gap-2 py-4 sm:grid-cols-2">
              {Object.entries(team.round2_investigation_summary).map(([k, v]) => (
                <p key={k} className="font-mono-data text-sm text-foreground">
                  <span className="text-secondary">{k.toUpperCase()}:</span> {v}
                </p>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-mono-data text-sm tracking-widest text-primary">
          ROUND 3 CASE
        </h2>
        {team.case ? (
          <Card>
            <CardContent className="py-4">
              <p className="font-mono-data text-sm text-foreground">
                Case {team.case.case_number} · {team.case.title}
              </p>
              <p className="font-mono-data text-xs text-muted-foreground">
                Assigned {new Date(team.case.assigned_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ) : (
          <p className="font-mono-data text-sm text-muted-foreground">Not assigned yet.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-mono-data text-sm tracking-widest text-primary">
          SUBMISSION HISTORY
        </h2>
        {team.submission_history.length === 0 ? (
          <p className="font-mono-data text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <div className="grid gap-2">
            {team.submission_history.map((s) => (
              <Card key={s.submission_id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-mono-data text-sm text-foreground">
                      v{s.version} · {s.file_name}
                    </p>
                    <p className="font-mono-data text-xs text-muted-foreground">
                      {s.uploaded_by ?? "unknown"} ·{" "}
                      {new Date(s.submitted_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.is_current && <Badge>CURRENT</Badge>}
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-mono-data"
                      onClick={() => downloadAdminSubmission(s.submission_id, s.file_name)}
                    >
                      DOWNLOAD
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-mono-data text-sm tracking-widest text-primary">
          SCORES
        </h2>
        {team.scores.length === 0 ? (
          <p className="font-mono-data text-sm text-muted-foreground">Not judged yet.</p>
        ) : (
          <div className="grid gap-2">
            {team.scores.map((sc, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="font-mono-data text-sm text-secondary">
                    Total: {sc.total}/60 {sc.finalized && <Badge className="ml-2">FINALIZED</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="font-mono-data text-xs text-muted-foreground">
                  Understanding {sc.problem_understanding} · Technical {sc.technical_solution} ·
                  Creativity {sc.creativity} · Presentation {sc.presentation} · Feasibility{" "}
                  {sc.feasibility}
                  {sc.comments && <p className="mt-2 text-foreground">{sc.comments}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
