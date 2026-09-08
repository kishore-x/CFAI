export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, StatCard, TaskStatusBadge, TaskPriorityLabel, Avatar } from "@/lib/ui";
import { requireUser, canAccessEmployee, hasCompanyWideView } from "@/lib/authorize";
import { AssignTaskForm } from "@/app/tasks/assign-task-form";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  if (!(await canAccessEmployee(user, id))) notFound();

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      assignments: { where: { active: true }, include: { project: true } },
      assignedTasks: { include: { project: true }, orderBy: [{ status: "asc" }, { dueDate: "asc" }] },
    },
  });
  if (!employee) notFound();

  const companyWide = hasCompanyWideView(user);
  const tasks = employee.assignedTasks;
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "COMPLETED").length;
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const blocked = tasks.filter((t) => t.status === "BLOCKED").length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  let projects: { id: string; name: string }[] = [];
  if (companyWide) {
    projects = await prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={employee.name} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{employee.name}</h1>
            <p className="text-sm text-[var(--muted)]">{employee.title} · {employee.department}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {companyWide && (
            <Link href="/attendance" className="text-xs text-[var(--accent)] hover:underline self-center">
              Attendance history →
            </Link>
          )}
          {companyWide && <AssignTaskForm projects={projects} employees={[{ id: employee.id, name: employee.name }]} defaultAssigneeId={employee.id} />}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-[var(--muted)] mb-2">Projects</h2>
        <div className="flex flex-wrap gap-2">
          {employee.assignments.map((a) => (
            <span key={a.id} className="text-xs px-2.5 py-1 rounded-full border border-[var(--border)]">
              {a.project.name}
            </span>
          ))}
          {employee.assignments.length === 0 && <span className="text-sm text-[var(--muted)]">No active projects.</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total tasks" value={total} />
        <StatCard label="Completed" value={completed} />
        <StatCard label="In progress" value={inProgress} />
        <StatCard label="Blocked" value={blocked} />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Overall progress</h2>
          <span className="text-sm text-[var(--muted)]">{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${progress}%` }} />
        </div>
      </Card>

      <Card className="p-5 overflow-x-auto">
        <h2 className="font-semibold mb-3">Current tasks</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="pb-2 font-medium">Task</th>
              <th className="pb-2 font-medium">Project</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Priority</th>
              <th className="pb-2 font-medium">Due</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-t border-[var(--border)]">
                <td className="py-2.5 pr-4 text-sm">{t.title}</td>
                <td className="py-2.5 pr-4 text-sm text-[var(--muted)]">{t.project.name}</td>
                <td className="py-2.5 pr-4">
                  <TaskStatusBadge status={t.status} />
                </td>
                <td className="py-2.5 pr-4">
                  <TaskPriorityLabel priority={t.priority} />
                </td>
                <td className="py-2.5 pr-4 text-sm text-[var(--muted)]">
                  {t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-[var(--muted)]">
                  No tasks assigned.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
