export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Card, StatCard, ProjectStatusBadge } from "@/lib/ui";
import { requireUser, hasCompanyWideView } from "@/lib/authorize";
import { notFound } from "next/navigation";
import { monthlyAttendanceStats } from "@/lib/attendance-stats";

export default async function ReportsPage() {
  const user = await requireUser();
  if (!hasCompanyWideView(user)) {
    // Reports are an Owner/PM operational view -- not part of a developer's scope.
    notFound();
  }

  const now = new Date();
  const [employees, tasks, projects, pendingLeave] = await Promise.all([
    prisma.employee.findMany({ where: { active: true } }),
    prisma.task.findMany({ include: { assignedTo: true } }),
    prisma.project.findMany({ include: { tasks: true } }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
  ]);

  const stats = await monthlyAttendanceStats(employees.map((e) => e.id), now.getUTCFullYear(), now.getUTCMonth() + 1);
  const avgAttendance = employees.length > 0
    ? Math.round((Array.from(stats.values()).reduce((sum, s) => sum + s.attendancePct, 0) / employees.length) * 10) / 10
    : 0;

  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const projectsByStatus = {
    PLANNING: projects.filter((p) => p.status === "PLANNING").length,
    ACTIVE: projects.filter((p) => p.status === "ACTIVE").length,
    ON_HOLD: projects.filter((p) => p.status === "ON_HOLD").length,
    COMPLETED: projects.filter((p) => p.status === "COMPLETED").length,
    CANCELLED: projects.filter((p) => p.status === "CANCELLED").length,
  };

  const developers = employees.filter((e) => e.role === "DEVELOPER");
  const now2 = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Company summary — {now.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Avg. attendance" value={`${avgAttendance}%`} />
        <StatCard label="Task completion" value={`${taskCompletionRate}%`} hint={`${completedTasks}/${tasks.length} tasks`} />
        <StatCard label="Active projects" value={projectsByStatus.ACTIVE + projectsByStatus.PLANNING} />
        <StatCard label="Pending leave requests" value={pendingLeave} />
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Projects by status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
          {Object.entries(projectsByStatus).map(([status, count]) => (
            <div key={status} className="rounded-md bg-white/5 px-3 py-2">
              <div className="text-[var(--muted)] text-xs">{status.replace("_", " ")}</div>
              <div className="text-lg font-semibold">{count}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 overflow-x-auto">
        <h2 className="font-semibold mb-3">Attendance report — {now.toLocaleDateString("en-GB", { month: "long" })}</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="pb-2 font-medium">Employee</th>
              <th className="pb-2 font-medium text-right">Office</th>
              <th className="pb-2 font-medium text-right">WFH</th>
              <th className="pb-2 font-medium text-right">Leave</th>
              <th className="pb-2 font-medium text-right">Absent</th>
              <th className="pb-2 font-medium text-right">Attendance %</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => {
              const s = stats.get(e.id);
              if (!s) return null;
              return (
                <tr key={e.id} className="border-t border-[var(--border)]">
                  <td className="py-2 pr-4 text-sm">{e.name}</td>
                  <td className="py-2 pr-4 text-sm text-right">{s.officeDays}</td>
                  <td className="py-2 pr-4 text-sm text-right">{s.wfhDays}</td>
                  <td className="py-2 pr-4 text-sm text-right">{s.leaveDays}</td>
                  <td className="py-2 pr-4 text-sm text-right">{s.absentDays}</td>
                  <td className="py-2 pr-4 text-sm text-right">{s.attendancePct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="p-5 overflow-x-auto">
        <h2 className="font-semibold mb-3">Project report</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="pb-2 font-medium">Project</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium text-right">Total tasks</th>
              <th className="pb-2 font-medium text-right">Completed</th>
              <th className="pb-2 font-medium text-right">Blocked</th>
              <th className="pb-2 font-medium text-right">Overdue</th>
              <th className="pb-2 font-medium">Progress</th>
              <th className="pb-2 font-medium">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const done = p.tasks.filter((t) => t.status === "COMPLETED").length;
              const blocked = p.tasks.filter((t) => t.status === "BLOCKED").length;
              const overdue = p.tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now2 && t.status !== "COMPLETED").length;
              const progress = p.progressOverride ?? (p.tasks.length > 0 ? Math.round((done / p.tasks.length) * 100) : 0);
              return (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="py-2 pr-4 text-sm">{p.name}</td>
                  <td className="py-2 pr-4">
                    <ProjectStatusBadge status={p.status} />
                  </td>
                  <td className="py-2 pr-4 text-sm text-right">{p.tasks.length}</td>
                  <td className="py-2 pr-4 text-sm text-right">{done}</td>
                  <td className="py-2 pr-4 text-sm text-right">{blocked}</td>
                  <td className="py-2 pr-4 text-sm text-right">{overdue}</td>
                  <td className="py-2 pr-4 text-sm">{progress}%</td>
                  <td className="py-2 pr-4 text-sm text-[var(--muted)]">{p.deadline ? new Date(p.deadline).toLocaleDateString("en-GB") : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="p-5 overflow-x-auto">
        <h2 className="font-semibold mb-3">Developer work report</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="pb-2 font-medium">Developer</th>
              <th className="pb-2 font-medium text-right">Assigned</th>
              <th className="pb-2 font-medium text-right">Completed</th>
              <th className="pb-2 font-medium text-right">In progress</th>
              <th className="pb-2 font-medium text-right">Blocked</th>
              <th className="pb-2 font-medium text-right">Overdue</th>
              <th className="pb-2 font-medium">Progress %</th>
            </tr>
          </thead>
          <tbody>
            {developers.map((d) => {
              const mine = tasks.filter((t) => t.assignedToId === d.id);
              const completed = mine.filter((t) => t.status === "COMPLETED").length;
              const inProgress = mine.filter((t) => t.status === "IN_PROGRESS").length;
              const blocked = mine.filter((t) => t.status === "BLOCKED").length;
              const overdue = mine.filter((t) => t.dueDate && new Date(t.dueDate) < now2 && t.status !== "COMPLETED").length;
              const progress = mine.length > 0 ? Math.round((completed / mine.length) * 100) : 0;
              return (
                <tr key={d.id} className="border-t border-[var(--border)]">
                  <td className="py-2 pr-4 text-sm">{d.name}</td>
                  <td className="py-2 pr-4 text-sm text-right">{mine.length}</td>
                  <td className="py-2 pr-4 text-sm text-right">{completed}</td>
                  <td className="py-2 pr-4 text-sm text-right">{inProgress}</td>
                  <td className="py-2 pr-4 text-sm text-right">{blocked}</td>
                  <td className="py-2 pr-4 text-sm text-right">{overdue}</td>
                  <td className="py-2 pr-4 text-sm">{progress}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
