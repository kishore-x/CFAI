export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Card, StatCard } from "@/lib/ui";
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
    prisma.task.findMany(),
    prisma.project.findMany(),
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
        <h2 className="font-semibold mb-3">Attendance % by developer (this month)</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="pb-2 font-medium">Employee</th>
              <th className="pb-2 font-medium text-right">Office</th>
              <th className="pb-2 font-medium text-right">WFH</th>
              <th className="pb-2 font-medium text-right">Leave</th>
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
                  <td className="py-2 pr-4 text-sm text-right">{s.attendancePct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
