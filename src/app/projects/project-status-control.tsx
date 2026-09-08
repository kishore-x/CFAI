"use client";

import { useTransition } from "react";
import { updateProjectStatus, updateProjectProgressOverride } from "@/app/actions";

const STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];

export function ProjectStatusControl({
  projectId,
  status,
  progressOverride,
}: {
  projectId: string;
  status: string;
  progressOverride: number | null;
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
          className="w-16 rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-xs outline-none focus:border-white/60"
        />
      </label>
    </div>
  );
}
