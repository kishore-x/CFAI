import "server-only";
import { prisma } from "@/lib/db";
import { monthlyAttendanceStats, type EmployeeMonthStats } from "@/lib/attendance-stats";

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

export type TaskLike = { status: string; dueDate?: Date | null; priority?: string; assignedToId?: string | null };

export function getDeveloperProgress(tasks: TaskLike[]) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "COMPLETED").length;
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const blocked = tasks.filter((t) => t.status === "BLOCKED").length;
  const overdue = getOverdueTasks(tasks).length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, inProgress, blocked, overdue, progressPct };
}

export function getProjectProgress(project: { progressOverride: number | null; tasks: { status: string }[] }) {
  if (project.progressOverride !== null) return project.progressOverride;
  if (project.tasks.length === 0) return 0;
  return Math.round((project.tasks.filter((t) => t.status === "COMPLETED").length / project.tasks.length) * 100);
}

export type WorkloadLevel = "LOW" | "NORMAL" | "HIGH" | "OVERLOADED";

/** Active task count (not TODO... actually any non-completed task counts as active workload), weighted lightly by priority. */
export function getDeveloperWorkload(tasks: TaskLike[]): { activeCount: number; level: WorkloadLevel } {
  const active = tasks.filter((t) => t.status !== "COMPLETED");
  const weight = active.reduce((sum, t) => sum + (t.priority === "URGENT" ? 2 : t.priority === "HIGH" ? 1.5 : 1), 0);

  let level: WorkloadLevel = "LOW";
  if (weight >= 9) level = "OVERLOADED";
  else if (weight >= 6) level = "HIGH";
  else if (weight >= 3) level = "NORMAL";

  return { activeCount: active.length, level };
}

export function getOverdueTasks<T extends TaskLike>(tasks: T[]): T[] {
  const now = new Date();
  return tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "COMPLETED");
}

export function getPendingTasks<T extends TaskLike>(tasks: T[]): T[] {
  return tasks.filter((t) => t.status !== "COMPLETED");
}

/** Attendance summary for one employee for a given month -- thin wrapper for naming parity with the spec. */
export async function getAttendanceSummary(employeeId: string, year: number, month: number): Promise<EmployeeMonthStats | undefined> {
  const stats = await monthlyAttendanceStats([employeeId], year, month);
  return stats.get(employeeId);
}

export async function getTeamAttendance(employeeIds: string[], year: number, month: number) {
  return monthlyAttendanceStats(employeeIds, year, month);
}

/** Leave balance per configured policy, computed from approved leave requests -- not stored, so it can never drift. */
export async function getLeaveBalance(employeeId: string, now = new Date()) {
  const policies = await prisma.leavePolicy.findMany({ where: { active: true } });
  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: { employeeId, status: "APPROVED" },
  });

  return policies.map((policy) => {
    const allowance = policy.period === "MONTHLY" ? policy.monthlyAllowance ?? 0 : policy.annualAllowance ?? 0;

    const periodStart =
      policy.period === "MONTHLY"
        ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
        : new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const periodEnd =
      policy.period === "MONTHLY"
        ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
        : new Date(Date.UTC(now.getUTCFullYear(), 11, 31));

    const used = approvedLeaves
      .filter((l) => l.type === policy.name && l.startDate <= periodEnd && l.endDate >= periodStart)
      .reduce((sum, l) => {
        const s = l.startDate > periodStart ? l.startDate : periodStart;
        const e = l.endDate < periodEnd ? l.endDate : periodEnd;
        const days = Math.floor((startOfDay(e).getTime() - startOfDay(s).getTime()) / 86400000) + 1;
        return sum + Math.max(days, 0);
      }, 0);

    return {
      policyId: policy.id,
      name: policy.name,
      period: policy.period,
      allowance,
      used,
      remaining: Math.max(allowance - used, 0),
    };
  });
}

export async function getTeamProgress(employeeIds: string[]) {
  const tasks = await prisma.task.findMany({ where: { assignedToId: { in: employeeIds } } });
  return employeeIds.map((employeeId) => {
    const mine = tasks.filter((t) => t.assignedToId === employeeId);
    return { employeeId, ...getDeveloperProgress(mine), workload: getDeveloperWorkload(mine) };
  });
}
