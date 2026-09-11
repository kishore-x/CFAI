"use client";

import { useState, useTransition } from "react";
import { updateTaskStatus } from "@/app/actions";
import { TaskPriorityLabel } from "@/lib/ui";

const COLUMNS = ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "COMPLETED"];
const COLUMN_LABEL: Record<string, string> = {
  TODO: "Todo",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  BLOCKED: "Blocked",
  COMPLETED: "Completed",
};

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  assignedToName: string | null;
  projectName: string;
};

export function TaskBoard({ tasks, editable }: { tasks: Task[]; editable: boolean }) {
  const [items, setItems] = useState(tasks);
  const [isPending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);

  function move(taskId: string, status: string) {
    setItems((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    startTransition(async () => {
      try {
        await updateTaskStatus(taskId, status);
      } catch {
        // Revert on failure (e.g. server-side authorization rejected it).
        setItems(tasks);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {COLUMNS.map((col) => (
        <div
          key={col}
          onDragOver={(e) => editable && e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (editable && dragId) move(dragId, col);
            setDragId(null);
          }}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 min-h-[120px]"
        >
          <div className="text-xs font-medium text-[var(--muted)] px-1 pb-2">
            {COLUMN_LABEL[col]} <span className="opacity-60">({items.filter((t) => t.status === col).length})</span>
          </div>
          <div className="space-y-1.5">
            {items
              .filter((t) => t.status === col)
              .map((t) => {
                const overdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED";
                return (
                  <div
                    key={t.id}
                    draggable={editable}
                    onDragStart={() => setDragId(t.id)}
                    className={`rounded-md bg-white/5 p-2.5 text-xs ${editable ? "cursor-grab active:cursor-grabbing" : ""} ${isPending ? "opacity-70" : ""}`}
                  >
                    <div className="font-medium text-[var(--foreground)] mb-1">{t.title}</div>
                    <div className="text-[var(--muted)]">{t.projectName}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <TaskPriorityLabel priority={t.priority} />
                      {t.dueDate && (
                        <span className={overdue ? "text-red-400" : "text-[var(--muted)]"}>
                          {new Date(t.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </span>
                      )}
                    </div>
                    <div className="text-[var(--muted)] mt-1">{t.assignedToName ?? "Unassigned"}</div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
