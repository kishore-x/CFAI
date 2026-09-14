"use client";

import { useTransition } from "react";
import { updateProjectStatus, updateProjectProgressOverride, updateProjectDeadline } from "@/app/actions";

const STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];

function toDateInputValue(d: Date | null) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function ProjectStatusControl({
  projectId,
  status,
  progressOverride,
  deadline,
}: {
  projectId: string;
  status: string;
  progressOverride: number | null;
  deadline: Date | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <select
        className="text-xs border border-[var(--border)] rounded-md px-2 py-1 bg-[var(--surface)] text-[var(--foreground)] disabled:opacity-50"
        value={status}
        disabled={isPending}
        onChange={(e) => startTransition(() => updateProjectStatus(projectId, e.target.value))}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace("_", " ")}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
        Override %
        <input
          type="number"
          min={0}
          max={100}
          disabled={isPending}
          placeholder="auto"
          defaultValue={progressOverride ?? ""}
          onBlur={(e) => {
            const v = e.target.value === "" ? null : Number(e.target.value);
            startTransition(() => updateProjectProgressOverride(projectId, v));
          }}
          className="w-16 rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-xs outline-none focus:border-[var(--border-60)]"
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
        Deadline
        <input
          type="date"
          disabled={isPending}
          defaultValue={toDateInputValue(deadline)}
          onBlur={(e) => {
            const v = e.target.value || null;
            startTransition(() => updateProjectDeadline(projectId, v));
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs outline-none focus:border-[var(--border-60)] disabled:opacity-50"
        />
      </label>
    </div>
  );
}
