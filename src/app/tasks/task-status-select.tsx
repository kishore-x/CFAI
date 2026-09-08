"use client";

import { useTransition } from "react";
import { updateTaskStatus } from "@/app/actions";
import { TaskStatusBadge } from "@/lib/ui";

const STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "COMPLETED"];

export function TaskStatusSelect({ taskId, status, editable }: { taskId: string; status: string; editable: boolean }) {
  const [isPending, startTransition] = useTransition();

  if (!editable) return <TaskStatusBadge status={status} />;

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => startTransition(() => updateTaskStatus(taskId, e.target.value))}
      className="text-[11px] border border-[var(--border)] rounded-md px-1.5 py-1 bg-[var(--surface)] text-[var(--foreground)] disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}
