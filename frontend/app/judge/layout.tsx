"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getMe, getStoredToken, logout } from "@/lib/api";

export default function JudgeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace("/login");
      return;
    }
    getMe()
      .then((me) => {
        if (me.role !== "judge") {
          router.replace("/dashboard");
          return;
        }
        setAllowed(true);
      })
      .catch(() => {
        logout();
        router.replace("/login");
      });
  }, [router]);

  if (!allowed) {
    return (
      <p className="p-10 font-mono-data text-sm text-muted-foreground">
        LOADING JUDGE PORTAL...
      </p>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
        <span className="glow-cyan font-mono-data text-sm font-bold text-primary">
          DIGIHUNT // JUDGE
        </span>
        <Button
          variant="outline"
          size="sm"
          className="font-mono-data"
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          LOGOUT
        </Button>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
