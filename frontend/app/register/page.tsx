"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, registerTeam } from "@/lib/api";

const EMPTY_MEMBER = { name: "", email: "", password: "" };

const inputClass =
  "w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground font-mono-data outline-none focus:ring-2 focus:ring-ring";

export default function RegisterPage() {
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState([
    { ...EMPTY_MEMBER },
    { ...EMPTY_MEMBER },
    { ...EMPTY_MEMBER },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ team_code: string } | null>(null);

  function updateMember(i: number, field: keyof typeof EMPTY_MEMBER, value: string) {
    setMembers((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m))
    );
  }

  function validate(): string | null {
    if (!teamName.trim()) return "Team name is required.";
    const emails = members.map((m) => m.email.trim().toLowerCase());
    if (members.some((m) => !m.name.trim() || !m.email.trim() || !m.password))
      return "All 3 members need a name, email, and password.";
    if (members.some((m) => m.password.length < 8))
      return "Passwords must be at least 8 characters.";
    if (new Set(emails).size !== emails.length)
      return "Member emails must be unique.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await registerTeam({ team_name: teamName.trim(), members });
      setResult({ team_code: res.team_code });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-20">
        <Card className="glow-border w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="glow-cyan font-mono-data text-2xl text-primary">
              TEAM CREATED
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your team code — keep it safe, you&apos;ll want it later:
            </p>
            <p className="font-mono-data text-3xl font-bold tracking-widest text-secondary">
              {result.team_code}
            </p>
            <Button
              size="lg"
              className="glow-border font-mono-data"
              render={<a href="/login" />}
              nativeButton={false}
            >
              GO TO LOGIN
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-16">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="glow-cyan font-mono-data text-3xl font-bold text-primary">
            DIGIHUNT // TEAM REGISTRATION
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Exactly 3 members. Each gets their own login.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="glow-border">
            <CardContent className="space-y-2 pt-6">
              <label
                htmlFor="team-name"
                className="font-mono-data text-xs uppercase tracking-wide text-secondary"
              >
                Team Name
              </label>
              <input
                id="team-name"
                className={inputClass}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Null Pointers"
              />
            </CardContent>
          </Card>

          {members.map((member, i) => (
            <Card key={i} className="glow-border">
              <CardHeader>
                <CardTitle className="font-mono-data text-sm text-secondary">
                  MEMBER {i + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <label
                    htmlFor={`member-${i}-name`}
                    className="font-mono-data text-xs uppercase tracking-wide text-muted-foreground"
                  >
                    Name
                  </label>
                  <input
                    id={`member-${i}-name`}
                    className={inputClass}
                    placeholder="Name"
                    value={member.name}
                    onChange={(e) => updateMember(i, "name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor={`member-${i}-email`}
                    className="font-mono-data text-xs uppercase tracking-wide text-muted-foreground"
                  >
                    Email
                  </label>
                  <input
                    id={`member-${i}-email`}
                    className={inputClass}
                    placeholder="Email"
                    type="email"
                    value={member.email}
                    onChange={(e) => updateMember(i, "email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor={`member-${i}-password`}
                    className="font-mono-data text-xs uppercase tracking-wide text-muted-foreground"
                  >
                    Password
                  </label>
                  <input
                    id={`member-${i}-password`}
                    className={inputClass}
                    placeholder="Password (min 8 chars)"
                    type="password"
                    value={member.password}
                    onChange={(e) => updateMember(i, "password", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 font-mono-data text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="glow-border w-full font-mono-data"
            disabled={submitting}
          >
            {submitting ? "REGISTERING..." : "REGISTER TEAM"}
          </Button>
        </form>
      </div>
    </main>
  );
}
