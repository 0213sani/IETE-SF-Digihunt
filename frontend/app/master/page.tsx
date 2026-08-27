"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTeamSocket } from "@/hooks/useTeamSocket";
import {
  ApiError,
  getMasterStatus,
  getStoredToken,
  verifyMasterCode,
  type MasterStatusOut,
} from "@/lib/api";

const CHECKLIST = [
  "Identity verified",
  "Investigation complete",
  "Access key verified",
];

export default function MasterPage() {
  const router = useRouter();
  const [status, setStatus] = useState<MasterStatusOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; message: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getMasterStatus();
      setStatus(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Failed to load system status.");
    }
  }, [router]);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace("/login");
      return;
    }
    fetchStatus();
  }, [router, fetchStatus]);

  useTeamSocket(
    useCallback(
      (event) => {
        if (event.type === "master_terminal_unlocked") fetchStatus();
      },
      [fetchStatus]
    )
  );

  async function handleVerify() {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const res = await verifyMasterCode(code.trim());
      setResult(res);
      if (res.correct) {
        setStatus((s) => (s ? { ...s, solved: true } : s));
      } else {
        setCode("");
      }
    } catch (err) {
      setResult({
        correct: false,
        message: err instanceof ApiError ? err.message : "Verification failed.",
      });
    } finally {
      setBusy(false);
    }
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

  if (!status) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="font-mono-data text-sm text-muted-foreground">
          ESTABLISHING SECURE CONNECTION...
        </p>
      </main>
    );
  }

  const solved = status.solved || result?.correct;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <h1 className="glow-cyan font-mono-data text-3xl font-bold tracking-widest text-primary">
        MASTER TERMINAL
      </h1>

      {!status.eligible && !solved && (
        <Card className="w-full border-destructive/40">
          <CardHeader>
            <CardTitle className="font-mono-data text-lg text-destructive">
              SYSTEM NOT READY
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-mono-data text-sm text-muted-foreground">
              The Master Terminal unlocks once your team has fully solved Round 2.
            </p>
            <Button
              variant="outline"
              className="font-mono-data"
              onClick={() => router.push("/round2")}
            >
              GO TO ROUND 2
            </Button>
          </CardContent>
        </Card>
      )}

      {status.eligible && !solved && (
        <Card className="glow-border w-full">
          <CardHeader>
            <CardTitle className="font-mono-data text-lg text-secondary">
              ENTER YOUR ACCESS KEY
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-mono-data text-xs text-muted-foreground">
              Enter the access key your team earned by completing Round 1.
            </p>
            <label htmlFor="master-code" className="sr-only">
              Access key
            </label>
            <input
              id="master-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleVerify();
              }}
              disabled={busy}
              placeholder="ACCESS KEY"
              autoFocus
              className="w-full rounded-md border border-border bg-input px-4 py-3 text-center font-mono-data text-lg uppercase tracking-widest text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              className="w-full font-mono-data"
              disabled={busy || !code.trim()}
              onClick={handleVerify}
            >
              {busy ? "VERIFYING..." : "SUBMIT"}
            </Button>

            {result && !result.correct && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 font-mono-data text-sm text-destructive">
                {result.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {solved && (
        <Card className="glow-border w-full border-primary">
          <CardHeader>
            <CardTitle className="glow-cyan font-mono-data text-2xl text-primary">
              {result?.correct ? result.message : "ACCESS GRANTED — Round 3 unlocked"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {CHECKLIST.map((item) => (
              <p
                key={item}
                className="flex items-center justify-center gap-2 font-mono-data text-sm text-foreground"
              >
                <Badge className="font-mono-data">OK</Badge>
                {item.toUpperCase()}
              </p>
            ))}
            <Button
              className="w-full font-mono-data"
              onClick={() => router.push("/round3")}
            >
              GO TO ROUND 3
            </Button>
          </CardContent>
        </Card>
      )}

      <Button
        variant="outline"
        className="font-mono-data"
        onClick={() => router.push("/dashboard")}
      >
        MISSION CONTROL
      </Button>
    </main>
  );
}
