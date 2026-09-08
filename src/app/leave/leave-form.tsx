"use client";

import { useState, useTransition } from "react";
import { submitLeaveRequest } from "@/app/actions";

const TYPES = ["Personal", "Sick", "Vacation", "Emergency"];

export function LeaveForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const type = String(form.get("type") ?? "Personal");
    const startDate = String(form.get("startDate") ?? "");
    const endDate = String(form.get("endDate") ?? "");
    const reason = String(form.get("reason") ?? "") || undefined;
    if (!startDate || !endDate) return;

    startTransition(async () => {
      try {
        await submitLeaveRequest({ type, startDate, endDate, reason });
        (e.target as HTMLFormElement).reset();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit");
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black">
        Request leave
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[var(--border)] rounded-xl bg-[var(--surface)] p-5 mb-4 grid sm:grid-cols-2 gap-3">
      <select name="type" defaultValue="Personal" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <div />
      <label className="text-xs text-[var(--muted)]">
        Start date
        <input name="startDate" type="date" required className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
      </label>
      <label className="text-xs text-[var(--muted)]">
        End date
        <input name="endDate" type="date" required className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
      </label>
      <input name="reason" placeholder="Reason (optional)" className="sm:col-span-2 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={isPending} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50">
          {isPending ? "Submitting…" : "Submit request"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--muted)]">
          Cancel
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </form>
  );
}
