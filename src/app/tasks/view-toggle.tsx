"use client";

import { useState } from "react";
import Link from "next/link";
import { TaskBoard } from "./task-board";
import { TaskPriorityLabel } from "@/lib/ui";
import { TaskStatusSelect } from "./task-status-select";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  assignedToId: string | null;
  assignedToName: string | null;
  projectName: string;
};

export function TaskViewToggle({ tasks, companyWide, currentUserId }: { tasks: Task[]; companyWide: boolean; currentUserId: string }) {
  const [view, setView] = useState<"list" | "board">("list");

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-1">
        <button
          onClick={() => setView("list")}
          className={`text-xs font-medium px-2.5 py-1 rounded-md ${view === "list" ? "bg-white/10 text-[var(--foreground)]" : "text-[var(--muted)] hover:bg-white/5"}`}
        >
          List
        </button>
        <button
          onClick={() => setView("board")}
          className={`text-xs font-medium px-2.5 py-1 rounded-md ${view === "board" ? "bg-white/10 text-[var(--foreground)]" : "text-[var(--muted)] hover:bg-white/5"}`}
        >
          Board
        </button>
      </div>

      {view === "board" ? (
        <TaskBoard
          tasks={tasks.map((t) => ({ ...t, projectName: t.projectName }))}
          editable={companyWide}
        />
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="pb-2 font-medium">Task</th>
                <th className="pb-2 font-medium">Project</th>
                {companyWide && <th className="pb-2 font-medium">Assignee</th>}
                <th className="pb-2 font-medium">Priority</th>
                <th className="pb-2 font-medium">Due</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const overdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED";
                const editable = companyWide || t.assignedToId === currentUserId;
                return (
                  <tr key={t.id} className="border-t border-[var(--border)]">
                    <td className="py-2.5 pr-4 text-sm">
                      <Link href={`/tasks/${t.id}`} className="hover:underline">
                        {t.title}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-sm text-[var(--muted)]">{t.projectName}</td>
                    {companyWide && <td className="py-2.5 pr-4 text-sm text-[var(--muted)]">{t.assignedToName ?? "Unassigned"}</td>}
                    <td className="py-2.5 pr-4">
                      <TaskPriorityLabel priority={t.priority} />
                    </td>
                    <td className={`py-2.5 pr-4 text-sm ${overdue ? "text-red-400" : "text-[var(--muted)]"}`}>
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                    </td>
                    <td className="py-2.5 pr-4">
                      <TaskStatusSelect taskId={t.id} status={t.status} editable={editable} />
                    </td>
                  </tr>
                );
              })}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={companyWide ? 6 : 5} className="py-6 text-center text-sm text-[var(--muted)]">
                    No tasks match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
