"use client";

import { useState, useTransition } from "react";
import { setSalesTarget } from "./sales-actions";

export function TargetForm({ reps, year, month }: { reps: { id: string; name: string }[]; year: number; month: number }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const employeeId = String(form.get("employeeId") ?? "");
    const targetAmount = Number(form.get("targetAmount") ?? 0);
    if (!employeeId) return;
    startTransition(async () => {
      await setSalesTarget(employeeId, year, month, targetAmount);
      setSaved(employeeId);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <select name="employeeId" required className="text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5" onChange={() => setSaved(null)}>
        <option value="">Select rep…</option>
        {reps.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <input name="targetAmount" type="number" min={0} required placeholder="Target (₹)" className="text-xs rounded-md border border-[var(--border)] bg-transparent px-2.5 py-1.5 outline-none focus:border-white/60 w-36" />
      <button type="submit" disabled={isPending} className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50">
        {isPending ? "Saving…" : "Set target"}
      </button>
      {saved && <span className="text-xs text-[var(--muted)]">Saved.</span>}
    </form>
  );
}
