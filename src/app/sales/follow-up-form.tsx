"use client";

import { useState, useTransition } from "react";
import { createFollowUp } from "./sales-actions";

const TYPES = ["CALL", "WHATSAPP", "EMAIL", "MEETING", "OTHER"];

export function FollowUpForm({ companies }: { companies: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const dueAt = String(form.get("dueAt") ?? "");
    if (!dueAt) return;

    startTransition(async () => {
      await createFollowUp({
        type: String(form.get("type") ?? "CALL"),
        dueAt,
        notes: String(form.get("notes") ?? "") || undefined,
        companyId: String(form.get("companyId") ?? "") || undefined,
      });
      (e.target as HTMLFormElement).reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black">
        + New follow-up
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[var(--border)] rounded-xl bg-[var(--surface)] p-5 mb-4 grid sm:grid-cols-2 gap-3">
      <select name="companyId" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
        <option value="">No company linked</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select name="type" defaultValue="CALL" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <input name="dueAt" type="datetime-local" required className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
      <input name="notes" placeholder="Notes" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />

      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={isPending} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50">
          {isPending ? "Creating…" : "Create follow-up"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--muted)]">
          Cancel
        </button>
      </div>
    </form>
  );
}
