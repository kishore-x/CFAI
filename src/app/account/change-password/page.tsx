"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { changePassword } from "@/app/actions";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { update } = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setLoading(true);
    const result = await changePassword(current, next);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    await update();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold tracking-tight mb-1">Set your password</h1>
        <p className="text-sm text-[var(--muted)] mb-6">
          You&apos;re using a temporary password. Set a new one to continue.
        </p>

        <form
          onSubmit={handleSubmit}
          className="border border-[var(--border)] rounded-xl bg-[var(--surface)] p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Current (temporary) password</label>
            <input
              type="password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Confirm new password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60"
            />
          </div>

          {error && <div className="text-xs text-red-400">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[var(--accent)] text-black font-medium text-sm py-2 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save password"}
          </button>
        </form>
      </div>
    </div>
  );
}
