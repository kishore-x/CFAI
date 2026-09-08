"use client";

import { useState, useTransition } from "react";
import { createTask, updateTaskStatus, reassignTask } from "@/app/actions";
import { TaskStatusBadge, TaskPriorityLabel } from "@/lib/ui";

const STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "COMPLETED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  assignedToId: string | null;
  assignedToName: string | null;
};

type Member = { id: string; name: string };

export function TaskList({
  projectId,
  tasks,
  members,
  canManage,
  currentUserId,
}: {
  projectId: string;
  tasks: Task[];
  members: Member[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) return;
    const assignedToId = String(form.get("assignedToId") ?? "") || undefined;
    const priority = String(form.get("priority") ?? "MEDIUM");
    const dueDate = String(form.get("dueDate") ?? "") || undefined;

    startTransition(async () => {
      await createTask({ projectId, title, assignedToId, priority, dueDate });
      (e.target as HTMLFormElement).reset();
      setShowForm(false);
    });
  }

  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED");

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-[var(--muted)]">
          Tasks
          {overdue.length > 0 && <span className="ml-2 text-red-400">{overdue.length} overdue</span>}
        </h3>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)} className="text-xs text-[var(--accent)] hover:underline">
            {showForm ? "Cancel" : "+ Add task"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-3 flex flex-wrap gap-2 items-center bg-white/5 rounded-md p-3">
          <input name="title" required placeholder="Task title" className="flex-1 min-w-[160px] rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-xs outline-none focus:border-white/60" />
          <select name="assignedToId" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs">
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select name="priority" defaultValue="MEDIUM" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input name="dueDate" type="date" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs" />
          <button type="submit" disabled={isPending} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50">
            Add
          </button>
        </form>
      )}

      <div className="space-y-1.5">
        {tasks.map((t) => {
          const canEditStatus = canManage || t.assignedToId === currentUserId;
          const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED";
          return (
            <div key={t.id} className="flex items-center gap-2 text-sm rounded-md px-2 py-1.5 hover:bg-white/5">
              <div className="flex-1 min-w-0 truncate">{t.title}</div>
              <TaskPriorityLabel priority={t.priority} />
              {t.dueDate && (
                <span className={`text-[11px] ${isOverdue ? "text-red-400" : "text-[var(--muted)]"}`}>
                  {new Date(t.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                </span>
              )}
              <span className="text-[11px] text-[var(--muted)] w-24 truncate text-right">{t.assignedToName ?? "Unassigned"}</span>
              {canEditStatus ? (
                <select
                  value={t.status}
                  disabled={isPending}
                  onChange={(e) => startTransition(() => updateTaskStatus(t.id, e.target.value))}
                  className="text-[11px] border border-[var(--border)] rounded-md px-1.5 py-1 bg-[var(--surface)] text-[var(--foreground)] disabled:opacity-50"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              ) : (
                <TaskStatusBadge status={t.status} />
              )}
              {canManage && (
                <select
                  value={t.assignedToId ?? ""}
                  disabled={isPending}
                  onChange={(e) => startTransition(() => reassignTask(t.id, e.target.value || null))}
                  className="text-[11px] border border-[var(--border)] rounded-md px-1.5 py-1 bg-[var(--surface)] text-[var(--foreground)] disabled:opacity-50"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
        {tasks.length === 0 && <div className="text-xs text-[var(--muted)] py-2">No tasks yet.</div>}
      </div>
    </div>
  );
}
