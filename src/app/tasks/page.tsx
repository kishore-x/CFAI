export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Card, TaskPriorityLabel, StatCard } from "@/lib/ui";
import { requireUser, hasCompanyWideView } from "@/lib/authorize";
import { AssignTaskForm } from "./assign-task-form";
import { TaskStatusSelect } from "./task-status-select";

export default async function TasksPage() {
  const user = await requireUser();
  const companyWide = hasCompanyWideView(user);

  const tasks = await prisma.task.findMany({
    where: companyWide ? {} : { assignedToId: user.id },
    include: { project: true, assignedTo: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  const counts = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "COMPLETED").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    inReview: tasks.filter((t) => t.status === "IN_REVIEW").length,
    blocked: tasks.filter((t) => t.status === "BLOCKED").length,
    todo: tasks.filter((t) => t.status === "TODO").length,
  };

  let projects: { id: string; name: string }[] = [];
  let employees: { id: string; name: string }[] = [];
  if (companyWide) {
    [projects, employees] = await Promise.all([
      prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.employee.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{companyWide ? "Tasks" : "My Tasks"}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{tasks.length} tasks</p>
        </div>
        {companyWide && <AssignTaskForm projects={projects} employees={employees} />}
      </div>

      {companyWide && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Completed" value={counts.completed} />
          <StatCard label="In progress" value={counts.inProgress} />
          <StatCard label="In review" value={counts.inReview} />
          <StatCard label="Blocked" value={counts.blocked} />
          <StatCard label="Todo" value={counts.todo} />
        </div>
      )}

      <Card className="p-5 overflow-x-auto">
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
              const editable = companyWide || t.assignedToId === user.id;
              return (
                <tr key={t.id} className="border-t border-[var(--border)]">
                  <td className="py-2.5 pr-4 text-sm">{t.title}</td>
                  <td className="py-2.5 pr-4 text-sm text-[var(--muted)]">{t.project.name}</td>
                  {companyWide && <td className="py-2.5 pr-4 text-sm text-[var(--muted)]">{t.assignedTo?.name ?? "Unassigned"}</td>}
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
                  No tasks yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
