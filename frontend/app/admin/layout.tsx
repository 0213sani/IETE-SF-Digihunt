"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api";

const NAV = [
  { href: "/admin", label: "DASHBOARD" },
  { href: "/admin/teams", label: "TEAMS" },
  { href: "/admin/submissions", label: "SUBMISSIONS" },
  { href: "/admin/settings", label: "SETTINGS" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="glow-cyan font-mono-data text-sm font-bold text-primary">
            DIGIHUNT // ADMIN
          </span>
          <nav className="flex flex-wrap gap-2">
            {NAV.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? undefined : "outline"}
                size="sm"
                className="font-mono-data"
                onClick={() => router.push(item.href)}
              >
                {item.label}
              </Button>
            ))}
          </nav>
        </div>
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
