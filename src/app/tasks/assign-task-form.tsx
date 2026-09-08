"use client";

import { useState, useTransition } from "react";
import { createTask } from "@/app/actions";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

type Option = { id: string; name: string };

export function AssignTaskForm({
  projects,
  employees,
  defaultProjectId,
  defaultAssigneeId,
}: {
  projects: Option[];
  employees: Option[];
  defaultProjectId?: string;
  defaultAssigneeId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const projectId = String(form.get("projectId") ?? "");
    const title = String(form.get("title") ?? "").trim();
    if (!projectId || !title) return;
    const description = String(form.get("description") ?? "") || undefined;
    const assignedToId = String(form.get("assignedToId") ?? "") || undefined;
    const priority = String(form.get("priority") ?? "MEDIUM");
    const dueDate = String(form.get("dueDate") ?? "") || undefined;

    startTransition(async () => {
      try {
        await createTask({ projectId, title, description, assignedToId, priority, dueDate });
        (e.target as HTMLFormElement).reset();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to assign task");
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black">
        + Assign task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[var(--border)] rounded-xl bg-[var(--surface)] p-5 grid sm:grid-cols-2 gap-3">
      <input name="title" required placeholder="Task title" className="sm:col-span-2 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
      <input name="description" placeholder="Description (optional)" className="sm:col-span-2 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
      <select name="projectId" required defaultValue={defaultProjectId} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
        <option value="">Select project…</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select name="assignedToId" defaultValue={defaultAssigneeId} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
        <option value="">Unassigned</option>
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      <select name="priority" defaultValue="MEDIUM" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <input name="dueDate" type="date" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={isPending} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50">
          {isPending ? "Assigning…" : "Assign task"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--muted)]">
          Cancel
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </form>
  );
}
