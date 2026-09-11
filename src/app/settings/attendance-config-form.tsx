"use client";

import { useTransition } from "react";
import { updateAttendanceConfig } from "./settings-actions";

export function AttendanceConfigForm({ officeStartTime, graceMinutes }: { officeStartTime: string; graceMinutes: number }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(() => updateAttendanceConfig(String(form.get("officeStartTime")), Number(form.get("graceMinutes"))));
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <label className="text-xs text-[var(--muted)]">
        Office start time
        <input name="officeStartTime" type="time" defaultValue={officeStartTime} className="block mt-1 rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs text-[var(--muted)]">
        Grace period (minutes)
        <input name="graceMinutes" type="number" min={0} defaultValue={graceMinutes} className="block mt-1 w-24 rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm" />
      </label>
      <button type="submit" disabled={isPending} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50">
        Save
      </button>
    </form>
  );
}
