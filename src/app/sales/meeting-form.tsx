"use client";

import { useState, useTransition } from "react";
import { createMeeting } from "./sales-actions";

const TYPES = ["CALL", "VIDEO", "IN_PERSON", "OTHER"];

export function MeetingForm({ companies }: { companies: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const scheduledAt = String(form.get("scheduledAt") ?? "");
    if (!scheduledAt) return;

    startTransition(async () => {
      await createMeeting({
        companyId: String(form.get("companyId") ?? "") || undefined,
        contactPerson: String(form.get("contactPerson") ?? "") || undefined,
        scheduledAt,
        meetingType: String(form.get("meetingType") ?? "CALL"),
        location: String(form.get("location") ?? "") || undefined,
        notes: String(form.get("notes") ?? "") || undefined,
      });
      (e.target as HTMLFormElement).reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black">
        + New meeting
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
      <input name="contactPerson" placeholder="Contact person" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
      <input name="scheduledAt" type="datetime-local" required className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
      <select name="meetingType" defaultValue="CALL" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {t.replace("_", " ")}
          </option>
        ))}
      </select>
      <input name="location" placeholder="Link / location" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
      <input name="notes" placeholder="Notes" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />

      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={isPending} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50">
          {isPending ? "Creating…" : "Create meeting"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--muted)]">
          Cancel
        </button>
      </div>
    </form>
  );
}
