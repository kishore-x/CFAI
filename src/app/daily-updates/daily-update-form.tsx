"use client";

import { useState, useTransition } from "react";
import { submitDailyUpdate } from "./daily-update-actions";

export function DailyUpdateForm({
  initial,
}: {
  initial?: { completed: string | null; inProgress: string | null; blocked: string | null; tomorrow: string | null };
}) {
  const [open, setOpen] = useState(!initial);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      await submitDailyUpdate({
        completed: String(form.get("completed") ?? ""),
        inProgress: String(form.get("inProgress") ?? ""),
        blocked: String(form.get("blocked") ?? ""),
        tomorrow: String(form.get("tomorrow") ?? ""),
      });
      setSaved(true);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-medium px-3 py-1.5 rounded-md border border-[var(--border)]">
        {saved || initial ? "Edit today's update" : "Submit today's update"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Completed today</label>
        <textarea name="completed" defaultValue={initial?.completed ?? ""} rows={2} className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
      </div>
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Working on</label>
        <textarea name="inProgress" defaultValue={initial?.inProgress ?? ""} rows={2} className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
      </div>
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Blocked by</label>
        <textarea name="blocked" defaultValue={initial?.blocked ?? ""} rows={2} className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
      </div>
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Tomorrow&apos;s plan</label>
        <textarea name="tomorrow" defaultValue={initial?.tomorrow ?? ""} rows={2} className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={isPending} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50">
          {isPending ? "Saving…" : "Save update"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--muted)]">
          Cancel
        </button>
      </div>
    </form>
  );
}
