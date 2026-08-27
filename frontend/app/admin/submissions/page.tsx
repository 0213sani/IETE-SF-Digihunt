"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  downloadAdminSubmission,
  getAdminSubmissions,
  getStoredToken,
  redirectOnAdminError,
  type AdminSubmissionListItem,
} from "@/lib/api";

export default function AdminSubmissionsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<AdminSubmissionListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace("/login");
      return;
    }
    getAdminSubmissions()
      .then(setSubmissions)
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

  if (!submissions) {
    return (
      <p className="font-mono-data text-sm text-muted-foreground">LOADING SUBMISSIONS...</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="glow-cyan font-mono-data text-2xl font-bold text-primary">
        SUBMISSIONS ({submissions.length})
      </h1>
      {submissions.length === 0 ? (
        <p className="font-mono-data text-sm text-muted-foreground">
          No team has submitted yet.
        </p>
      ) : (
        <div className="grid gap-2">
          {submissions.map((s) => (
            <Card key={s.submission_id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-mono-data text-sm text-secondary">{s.team_code}</p>
                  <p className="font-mono-data text-sm text-foreground">
                    v{s.version} · {s.file_name}
                  </p>
                  <p className="font-mono-data text-xs text-muted-foreground">
                    {new Date(s.submitted_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono-data"
                  onClick={() => downloadAdminSubmission(s.submission_id, s.file_name)}
                >
                  DOWNLOAD
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
