"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ApiError,
  getCase,
  getCurrentSubmission,
  getSubmissionHistory,
  getStoredToken,
  uploadSubmission,
  type CaseOut,
  type SubmissionOut,
} from "@/lib/api";

// Spec §28 — required presentation structure, shown as a persistent
// reference throughout the round, not just once.
const STRUCTURE = [
  "Problem",
  "Investigation findings",
  "Proposed solution",
  "UI",
  "How it works",
  "Technology/tools",
  "Impact",
  "Future scope",
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Round3Page() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [locked, setLocked] = useState(false);
  const [caseFile, setCaseFile] = useState<CaseOut | null>(null);
  const [current, setCurrent] = useState<SubmissionOut | null>(null);
  const [history, setHistory] = useState<SubmissionOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const refreshSubmissions = useCallback(async () => {
    try {
      setCurrent(await getCurrentSubmission());
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setCurrent(null);
      }
    }
    try {
      setHistory(await getSubmissionHistory());
    } catch {
      // non-fatal — history stays empty
    }
  }, []);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace("/login");
      return;
    }
    getCase()
      .then((data) => {
        setCaseFile(data);
        setLocked(false);
        refreshSubmissions();
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          setLocked(true);
          return;
        }
        setError(err instanceof ApiError ? err.message : "Failed to load case file.");
      });
  }, [router, refreshSubmissions]);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      await uploadSubmission(file);
      await refreshSubmissions();
    } catch (err) {
      if (err instanceof ApiError && err.status === 423) {
        setUploadError("UPLOAD FAILED — Submission deadline has passed.");
      } else {
        setUploadError("UPLOAD FAILED — Check file type and size.");
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  if (locked) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="glow-cyan font-mono-data text-xl font-bold text-primary">
          ROUND LOCKED
        </p>
        <p className="font-mono-data text-sm text-muted-foreground">
          Pass the Master Terminal to unlock this round.
        </p>
        <Button
          variant="outline"
          className="font-mono-data"
          onClick={() => router.push("/master")}
        >
          GO TO MASTER TERMINAL
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

  if (!caseFile) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="font-mono-data text-sm text-muted-foreground">
          LOADING CASE FILE...
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="glow-cyan font-mono-data text-2xl font-bold text-primary sm:text-3xl">
          ROUND 3 // THE FINAL HACK
        </h1>
        <Button
          variant="outline"
          className="font-mono-data"
          onClick={() => router.push("/dashboard")}
        >
          MISSION CONTROL
        </Button>
      </div>

      <Card className="glow-border border-primary">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="glow-cyan font-mono-data text-lg text-primary">
              CASE {caseFile.case_number} · {caseFile.title.toUpperCase()}
            </CardTitle>
            <Badge className="font-mono-data">ASSIGNED</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-mono-data text-sm text-foreground">
            {caseFile.description}
          </p>
          {caseFile.evidence && Object.keys(caseFile.evidence).length > 0 && (
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-black/40 p-3 font-mono-data text-xs text-secondary">
              {JSON.stringify(caseFile.evidence, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card className="glow-border">
        <CardHeader>
          <CardTitle className="font-mono-data text-sm text-secondary">
            REQUIRED PRESENTATION STRUCTURE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-2 font-mono-data text-sm text-foreground sm:grid-cols-2">
            {STRUCTURE.map((step, i) => (
              <li key={step} className="flex gap-2">
                <span className="text-primary">{String(i + 1).padStart(2, "0")}.</span>
                {step}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="glow-border">
        <CardHeader>
          <CardTitle className="font-mono-data text-sm text-secondary">
            SUBMIT YOUR DECK
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed px-6 py-12 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/10" : "border-border"
            }`}
          >
            <p className="font-mono-data text-sm font-bold text-foreground">
              {uploading ? "UPLOADING..." : "DROP YOUR .PPTX HERE"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ppt,.pptx"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button
              variant="outline"
              className="font-mono-data"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              [ SELECT FILE ]
            </Button>
          </div>

          {uploadError && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 font-mono-data text-sm text-destructive">
              {uploadError}
            </p>
          )}

          <div className="space-y-2">
            <p className="font-mono-data text-xs uppercase tracking-wide text-muted-foreground">
              Current Submission
            </p>
            {current ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-4 py-3">
                <span className="font-mono-data text-sm text-foreground">
                  {current.file_name} · v{current.version} · {formatBytes(current.file_size)}
                </span>
                <Badge className="font-mono-data">CURRENT</Badge>
              </div>
            ) : (
              <p className="font-mono-data text-sm text-muted-foreground">
                No submission uploaded yet.
              </p>
            )}
          </div>

          {history.length > 0 && (
            <div className="space-y-2">
              <p className="font-mono-data text-xs uppercase tracking-wide text-muted-foreground">
                Version History
              </p>
              <div className="grid gap-2">
                {history.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-4 py-2 font-mono-data text-xs text-foreground"
                  >
                    <span>
                      v{s.version} · {s.file_name} · {formatBytes(s.file_size)} ·{" "}
                      {new Date(s.submitted_at).toLocaleString()}
                    </span>
                    <Badge
                      variant={s.is_current ? undefined : "outline"}
                      className="font-mono-data"
                    >
                      {s.is_current ? "CURRENT" : "SUPERSEDED"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
