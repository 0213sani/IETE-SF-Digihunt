"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAdminDashboard,
  getStoredToken,
  redirectOnAdminError,
  type DashboardOut,
} from "@/lib/api";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="glow-border">
      <CardHeader>
        <CardTitle className="font-mono-data text-xs uppercase tracking-wide text-secondary">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="glow-cyan font-mono-data text-3xl font-bold text-primary">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace("/login");
      return;
    }
    getAdminDashboard()
      .then(setData)
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

  if (!data) {
    return (
      <p className="font-mono-data text-sm text-muted-foreground">
        LOADING EVENT DATA...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="glow-cyan font-mono-data text-2xl font-bold text-primary">
        EVENT DASHBOARD
      </h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Registered Teams" value={data.registered_teams} />
        <StatCard label="Active Teams" value={data.active_teams} />
        <StatCard label="Round 1 Touched" value={data.round1_count} />
        <StatCard label="Round 2 Touched" value={data.round2_count} />
        <StatCard label="Round 3 Touched" value={data.round3_count} />
        <StatCard label="Submissions" value={data.submitted_count} />
      </div>
    </div>
  );
}
