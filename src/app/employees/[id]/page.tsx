export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, StatCard, TaskStatusBadge, TaskPriorityLabel, Avatar } from "@/lib/ui";
import { requireUser, canAccessEmployee, hasCompanyWideView } from "@/lib/authorize";
import { AssignTaskForm } from "@/app/tasks/assign-task-form";
import { StartChatButton } from "@/app/messages/start-chat";
import { getDeveloperProgress, getDeveloperWorkload, getAttendanceSummary, getLeaveBalance } from "@/lib/services";

const WORKLOAD_STYLE: Record<string, string> = {
  LOW: "border border-[var(--border)] text-[var(--muted)]",
  NORMAL: "border border-white/40 text-[var(--foreground)]",
  HIGH: "bg-gray-400 text-black",
  OVERLOADED: "bg-white text-black",
};

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
  const progress = getDeveloperProgress(tasks);
  const workload = getDeveloperWorkload(tasks);

  const now = new Date();
  const [attendance, leaveBalance, recentUpdates, projects] = await Promise.all([
    getAttendanceSummary(id, now.getUTCFullYear(), now.getUTCMonth() + 1),
    getLeaveBalance(id),
    prisma.dailyWorkUpdate.findMany({ where: { employeeId: id }, orderBy: { date: "desc" }, take: 5 }),
    companyWide ? prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={employee.name} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{employee.name}</h1>
            <p className="text-sm text-[var(--muted)]">{employee.title} · {employee.department}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">Joined {new Date(employee.joinedAt).toLocaleDateString("en-GB")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {companyWide && employee.id !== user.id && (
            <div className="w-56">
              <StartChatButton employeeId={employee.id} name={employee.name} title="Open chat" />
            </div>
          )}
          {companyWide && <AssignTaskForm projects={projects} employees={[{ id: employee.id, name: employee.name }]} defaultAssigneeId={employee.id} />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${WORKLOAD_STYLE[workload.level]}`}>
          {workload.activeCount} active tasks · {workload.level}
        </span>
        <Link href="/attendance" className="text-xs text-[var(--accent)] hover:underline">
          Full attendance history →
        </Link>
      </div>

      <div>
        <h2 className="text-sm font-medium text-[var(--muted)] mb-2">Projects</h2>
        <div className="flex flex-wrap gap-2">
          {employee.assignments.map((a) => (
            <Link key={a.id} href={`/projects/${a.project.id}`} className="text-xs px-2.5 py-1 rounded-full border border-[var(--border)] hover:bg-white/5">
              {a.project.name}
            </Link>
          ))}
          {employee.assignments.length === 0 && <span className="text-sm text-[var(--muted)]">No active projects.</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total tasks" value={progress.total} />
        <StatCard label="Completed" value={progress.completed} />
        <StatCard label="In progress" value={progress.inProgress} />
        <StatCard label="Blocked" value={progress.blocked} />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Overall progress</h2>
          <span className="text-sm text-[var(--muted)]">{progress.completed} / {progress.total} — {progress.progressPct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${progress.progressPct}%` }} />
        </div>
      </Card>

      {attendance && (
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Attendance — {now.toLocaleDateString("en-GB", { month: "long" })}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="rounded-md bg-white/5 px-3 py-2">
              <div className="text-xs text-[var(--muted)]">Office</div>
              <div className="text-lg font-semibold">{attendance.officeDays}</div>
            </div>
            <div className="rounded-md bg-white/5 px-3 py-2">
              <div className="text-xs text-[var(--muted)]">WFH</div>
              <div className="text-lg font-semibold">{attendance.wfhDays}</div>
            </div>
            <div className="rounded-md bg-white/5 px-3 py-2">
              <div className="text-xs text-[var(--muted)]">Leave</div>
              <div className="text-lg font-semibold">{attendance.leaveDays}</div>
            </div>
            <div className="rounded-md bg-white/5 px-3 py-2">
              <div className="text-xs text-[var(--muted)]">Absent</div>
              <div className="text-lg font-semibold">{attendance.absentDays}</div>
            </div>
          </div>
        </Card>
      )}

      {leaveBalance.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Leave balance</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {leaveBalance.map((b) => (
              <div key={b.policyId} className="rounded-md bg-white/5 px-3 py-2">
                <div className="text-xs text-[var(--muted)]">{b.name}</div>
                <div className="text-lg font-semibold">{b.remaining}/{b.allowance}</div>
                <div className="text-xs text-[var(--muted)]">{b.used} used</div>
              </div>
            ))}
          </div>
        </Card>
      )}

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
                <td className="py-2.5 pr-4 text-sm">
                  <Link href={`/tasks/${t.id}`} className="hover:underline">
                    {t.title}
                  </Link>
                </td>
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

      {companyWide && (
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Recent daily updates</h2>
          <ul className="space-y-3 text-sm">
            {recentUpdates.map((u) => (
              <li key={u.id} className="border-b border-[var(--border)] pb-2 last:border-none">
                <div className="text-xs text-[var(--muted)] mb-1">{new Date(u.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</div>
                {u.completed && <div>✓ {u.completed}</div>}
                {u.inProgress && <div className="text-[var(--muted)]">→ {u.inProgress}</div>}
                {u.blocked && <div className="text-red-400">⚠ {u.blocked}</div>}
              </li>
            ))}
            {recentUpdates.length === 0 && <li className="text-[var(--muted)]">No updates submitted yet.</li>}
          </ul>
        </Card>
      )}
    </div>
  );
}
