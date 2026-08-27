"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getAdminTeams,
  getStoredToken,
  redirectOnAdminError,
  type AdminTeamListItem,
} from "@/lib/api";

function ProgressBar({ solved, total }: { solved: number; total: number }) {
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono-data text-xs text-muted-foreground">
        {solved}/{total}
      </span>
    </div>
  );
}

export default function AdminTeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<AdminTeamListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace("/login");
      return;
    }
    getAdminTeams()
      .then(setTeams)
      .catch((err) => {
        const msg = redirectOnAdminError(err, router);
        if (msg) setError(msg);
      });
  }, [router]);

  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 font-mono-data text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (!teams) {
    return (
      <p className="font-mono-data text-sm text-muted-foreground">LOADING TEAMS...</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="glow-cyan font-mono-data text-2xl font-bold text-primary">
        TEAMS ({teams.length})
      </h1>
      <Card className="glow-border">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[800px] text-left font-mono-data text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Members</th>
                <th className="px-4 py-3">Round 1</th>
                <th className="px-4 py-3">Round 2</th>
                <th className="px-4 py-3">Case</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr
                  key={t.id}
                  className="cursor-pointer border-b border-border/50 hover:bg-muted/40"
                  onClick={() => router.push(`/admin/teams/${t.id}`)}
                >
                  <td className="px-4 py-3 text-secondary">{t.team_code}</td>
                  <td className="px-4 py-3">{t.team_name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={t.status === "active" ? undefined : "destructive"}>
                      {t.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{t.member_count}</td>
                  <td className="px-4 py-3">
                    <ProgressBar solved={t.round1.solved} total={t.round1.total} />
                  </td>
                  <td className="px-4 py-3">
                    <ProgressBar solved={t.round2.solved} total={t.round2.total} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {t.round3_case ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {t.submitted ? (
                      <Badge>YES</Badge>
                    ) : (
                      <Badge variant="outline">NO</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
