"use client";

import { Suspense, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Avatar } from "@/lib/ui";

type RosterEntry = { id: string; name: string; role: string; title: string | null };

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  MANAGER: "Project Manager",
  DEVELOPER: "Developer",
};

function LoginForm({ roster }: { roster: RosterEntry[] }) {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isQuickLogin, startQuickLogin] = useTransition();
  const [quickLoginId, setQuickLoginId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    window.location.href = params.get("callbackUrl") ?? "/";
  }

  function quickLogin(employeeId: string) {
    setQuickLoginId(employeeId);
    startQuickLogin(async () => {
      const res = await signIn("mock", { employeeId, redirect: false });
      if (res?.error) {
        setError("Quick login failed.");
        setQuickLoginId(null);
        return;
      }
      window.location.href = params.get("callbackUrl") ?? "/";
    });
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="h-9 w-9 rounded-lg bg-[var(--accent)] flex items-center justify-center text-black font-bold text-sm">
            CF
          </div>
          <span className="font-semibold tracking-tight text-lg">ClickfieldAI Hub</span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="border border-[var(--border)] rounded-xl bg-[var(--surface)] p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60"
              placeholder="you@clickfieldai.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="text-xs text-red-400">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[var(--accent)] text-black font-medium text-sm py-2 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {roster.length > 0 && (
          <div className="mt-6">
            <div className="text-xs text-[var(--muted)] mb-2 text-center">Quick login (dev/demo — skips password)</div>
            <div className="border border-[var(--border)] rounded-xl bg-[var(--surface)] divide-y divide-[var(--border)] overflow-hidden">
              {roster.map((e) => (
                <button
                  key={e.id}
                  disabled={isQuickLogin}
                  onClick={() => quickLogin(e.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 disabled:opacity-50 transition-colors"
                >
                  <Avatar name={e.name} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{e.name}</div>
                    <div className="text-xs text-[var(--muted)] truncate">{e.title}</div>
                  </div>
                  <span className="text-xs text-[var(--muted)] shrink-0">
                    {quickLoginId === e.id && isQuickLogin ? "Logging in…" : ROLE_LABEL[e.role] ?? e.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function LoginPageClient({ roster }: { roster: RosterEntry[] }) {
  return (
    <Suspense>
      <LoginForm roster={roster} />
    </Suspense>
  );
}
