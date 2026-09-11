"use client";

import { useState, useTransition } from "react";
import { createMilestone, updateMilestone } from "./milestone-actions";

const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];
const STATUS_ICON: Record<string, string> = { NOT_STARTED: "○", IN_PROGRESS: "◐", COMPLETED: "✓" };

type Milestone = { id: string; name: string; status: string; progress: number; dueDate: string | null };

export function MilestoneList({ projectId, milestones, canManage }: { projectId: string; milestones: Milestone[]; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    const dueDate = String(form.get("dueDate") ?? "") || undefined;
    startTransition(async () => {
      await createMilestone({ projectId, name, dueDate });
      (e.target as HTMLFormElement).reset();
      setShowForm(false);
    });
  }

  return (
    <div className="space-y-2">
      {milestones.map((m) => (
        <div key={m.id} className="flex items-center gap-3 text-sm">
          <span className="w-4 shrink-0">{STATUS_ICON[m.status]}</span>
          <span className="flex-1 min-w-0 truncate">{m.name}</span>
          {m.dueDate && <span className="text-xs text-[var(--muted)] shrink-0">{new Date(m.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>}
          {canManage ? (
            <>
              <select
                value={m.status}
                disabled={isPending}
                onChange={(e) => startTransition(() => updateMilestone(m.id, { status: e.target.value }))}
                className="text-[11px] border border-[var(--border)] rounded-md px-1.5 py-1 bg-[var(--surface)] disabled:opacity-50"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                max={100}
                defaultValue={m.progress}
                disabled={isPending}
                onBlur={(e) => startTransition(() => updateMilestone(m.id, { progress: Number(e.target.value) }))}
                className="w-14 text-[11px] border border-[var(--border)] rounded-md px-1.5 py-1 bg-transparent disabled:opacity-50"
              />
            </>
          ) : (
            <span className="text-xs text-[var(--muted)] w-10 text-right shrink-0">{m.progress}%</span>
          )}
        </div>
      ))}
      {milestones.length === 0 && <div className="text-sm text-[var(--muted)]">No milestones yet.</div>}

      {canManage &&
        (showForm ? (
          <form onSubmit={handleCreate} className="flex items-center gap-2 pt-2">
            <input name="name" required placeholder="Milestone name" className="flex-1 rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-xs" />
            <input name="dueDate" type="date" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs" />
            <button type="submit" disabled={isPending} className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50">
              Add
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-[var(--muted)]">
              Cancel
            </button>
          </form>
        ) : (
          <button onClick={() => setShowForm(true)} className="text-xs text-[var(--accent)] hover:underline">
            + Add milestone
          </button>
        ))}
    </div>
  );
}
