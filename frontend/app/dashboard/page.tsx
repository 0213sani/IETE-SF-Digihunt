"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTeamSocket } from "@/hooks/useTeamSocket";
import {
  ApiError,
  getStoredToken,
  logout,
  getTeamMe,
  type TeamMeOut,
} from "@/lib/api";

const REFETCH_EVENTS = new Set([
  "round_progress_updated",
  "round_unlocked",
  "master_terminal_unlocked",
]);

function RoundBar({ solved, total }: { solved: number; total: number }) {
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function RoundCard({
  title,
  solved,
  total,
  locked,
  lockedMessage = "Unlocks later in the hunt.",
  onOpen,
}: {
  title: string;
  solved: number;
  total: number;
  locked: boolean;
  lockedMessage?: string;
  onOpen: () => void;
}) {
  if (locked) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-mono-data text-sm text-muted-foreground">
              {title}
            </CardTitle>
            <Badge variant="outline" className="font-mono-data">
              LOCKED
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-mono-data text-xs text-muted-foreground">
            {lockedMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="glow-border cursor-pointer transition-transform hover:scale-[1.01]"
      onClick={onOpen}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono-data text-sm text-secondary">
            {title}
          </CardTitle>
          {total === 0 ? (
            <Badge className="font-mono-data">AVAILABLE</Badge>
          ) : (
            <span className="font-mono-data text-xs text-muted-foreground">
              {solved}/{total}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <RoundBar solved={solved} total={total} />
        <p className="font-mono-data text-xs text-primary">ENTER →</p>
      </CardContent>
    </Card>
  );
}

function MasterCard({
  locked,
  solved,
  onOpen,
}: {
  locked: boolean;
  solved: boolean;
  onOpen: () => void;
}) {
  return (
    <Card
      className={locked ? "opacity-50" : "glow-border cursor-pointer"}
      onClick={locked ? undefined : onOpen}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono-data text-sm text-muted-foreground">
            MASTER TERMINAL
          </CardTitle>
          <Badge variant={locked ? "outline" : undefined} className="font-mono-data">
            {solved ? "COMPLETE" : locked ? "LOCKED" : "UNLOCKED"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-mono-data text-xs text-muted-foreground">
          {solved
            ? "Access granted — Round 3 unlocked."
            : locked
              ? "Unlocks after Round 2 is complete."
              : "Enter your access key."}
        </p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [team, setTeam] = useState<TeamMeOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  const fetchTeam = useCallback(() => {
    getTeamMe()
      .then(setTeam)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          logout();
          router.replace("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Failed to load team.");
      });
  }, [router]);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace("/login");
      return;
    }
    fetchTeam();
  }, [router, fetchTeam]);

  useTeamSocket(
    useCallback(
      (event) => {
        if (event.type === "member_online" && typeof event.user_id === "string") {
          setOnlineIds((s) => new Set(s).add(event.user_id as string));
        } else if (event.type === "member_offline" && typeof event.user_id === "string") {
          setOnlineIds((s) => {
            const next = new Set(s);
            next.delete(event.user_id as string);
            return next;
          });
        }
        if (REFETCH_EVENTS.has(event.type)) fetchTeam();
      },
      [fetchTeam]
    )
  );

  function handleLogout() {
    logout();
    router.push("/");
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

  if (!team) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="font-mono-data text-sm text-muted-foreground">
          LOADING MISSION DATA...
        </p>
      </main>
    );
  }

  const { round1, round2, round3, master } = team.rounds;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="glow-cyan font-mono-data text-2xl font-bold text-primary sm:text-3xl">
          DIGIHUNT // MISSION CONTROL
        </h1>
        <Button variant="outline" className="font-mono-data" onClick={handleLogout}>
          LOGOUT
        </Button>
      </div>

      <Card className="glow-border">
        <CardContent className="pt-6 text-center">
          <p className="font-mono-data text-xs uppercase tracking-wide text-muted-foreground">
            Team Code
          </p>
          <p className="glow-cyan font-mono-data text-4xl font-bold tracking-widest text-secondary">
            {team.team_code}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{team.team_name}</p>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 font-mono-data text-sm tracking-widest text-primary">
          TEAM MEMBERS
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {team.members.map((m) => {
            const online = onlineIds.has(m.id);
            return (
              <Card
                key={m.id}
                className={m.is_you ? "glow-border border-primary" : ""}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <span className="flex items-center gap-2 font-mono-data text-sm text-foreground">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        online ? "bg-primary glow-cyan" : "bg-muted-foreground/40"
                      }`}
                      title={online ? "Online" : "Offline"}
                    />
                    {m.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-data text-[10px] uppercase tracking-wide text-muted-foreground">
                      {online ? "ONLINE" : "OFFLINE"}
                    </span>
                    {m.is_you && <Badge className="font-mono-data">YOU</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-mono-data text-sm tracking-widest text-primary">
          MISSION PROGRESS
        </h2>

        <RoundCard
          title="ROUND 1 · THE DIGITAL TRAIL"
          solved={round1.solved}
          total={round1.total}
          locked={round1.locked}
          onOpen={() => router.push("/round1")}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <RoundCard
            title="ROUND 2 · DIGITAL DETECTIVES"
            solved={round2.solved}
            total={round2.total}
            locked={round2.locked}
            onOpen={() => router.push("/round2")}
          />
          <RoundCard
            title="ROUND 3 · THE FINAL HACK"
            solved={round3.solved}
            total={round3.total}
            locked={round3.locked}
            lockedMessage="Unlocks after the Master Terminal."
            onOpen={() => router.push("/round3")}
          />
          <MasterCard
            locked={master.locked}
            solved={master.solved}
            onOpen={() => router.push("/master")}
          />
        </div>
      </section>
    </main>
  );
}
