import "server-only";
import { prisma } from "@/lib/db";

function startOfDayUTC(d: Date) {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

function isWeekend(d: Date) {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

/** Every weekday in [start, end] (inclusive), UTC. */
function weekdaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = startOfDayUTC(start);
  const last = startOfDayUTC(end);
  while (cursor.getTime() <= last.getTime()) {
    if (!isWeekend(cursor)) days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export type EmployeeMonthStats = {
  employeeId: string;
  officeDays: number;
  wfhDays: number;
  leaveDays: number;
  workingDays: number; // officeDays + wfhDays
  totalWeekdays: number; // weekdays elapsed in the month so far (or whole month if in the past)
  absentDays: number;
  attendancePct: number; // workingDays / (totalWeekdays - leaveDays), i.e. of days they were expected to show up
};

/**
 * Computes office/WFH/leave/working-day stats for a set of employees over a
 * calendar month. Only APPROVED leave requests count toward leaveDays (per
 * business rule: rejected/pending leave contributes 0). Weekends are
 * excluded entirely -- never counted as absent. A weekday with no attendance
 * record and no approved leave covering it counts as absent, but only for
 * days up to today (we don't mark future weekdays absent).
 */
export async function monthlyAttendanceStats(employeeIds: string[], year: number, month: number /* 1-12 */): Promise<Map<string, EmployeeMonthStats>> {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0)); // last day of month
  const today = startOfDayUTC(new Date());
  const effectiveEnd = monthEnd.getTime() > today.getTime() ? today : monthEnd;

  const [attendance, leaves] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId: { in: employeeIds }, date: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.leaveRequest.findMany({
      where: {
        employeeId: { in: employeeIds },
        status: "APPROVED",
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
    }),
  ]);

  const weekdaysElapsed = effectiveEnd.getTime() >= monthStart.getTime() ? weekdaysInRange(monthStart, effectiveEnd) : [];

  const result = new Map<string, EmployeeMonthStats>();
  for (const employeeId of employeeIds) {
    const myAttendance = attendance.filter((a) => a.employeeId === employeeId);
    const myLeaves = leaves.filter((l) => l.employeeId === employeeId);

    const officeDays = myAttendance.filter((a) => a.status === "PRESENT" && a.workMode === "OFFICE").length;
    const wfhDays = myAttendance.filter((a) => a.status === "PRESENT" && a.workMode === "WFH").length;

    // Count distinct weekdays covered by any approved leave, within the elapsed range.
    const leaveDaySet = new Set<string>();
    for (const l of myLeaves) {
      const rangeStart = l.startDate.getTime() > monthStart.getTime() ? l.startDate : monthStart;
      const rangeEnd = l.endDate.getTime() < effectiveEnd.getTime() ? l.endDate : effectiveEnd;
      if (rangeStart.getTime() > rangeEnd.getTime()) continue;
      for (const d of weekdaysInRange(rangeStart, rangeEnd)) {
        leaveDaySet.add(d.toISOString());
      }
    }
    const leaveDays = leaveDaySet.size;

    const workingDays = officeDays + wfhDays;
    const totalWeekdays = weekdaysElapsed.length;
    const expectedDays = Math.max(totalWeekdays - leaveDays, 0);
    const absentDays = Math.max(expectedDays - workingDays, 0);
    const attendancePct = expectedDays > 0 ? Math.round((workingDays / expectedDays) * 1000) / 10 : 100;

    result.set(employeeId, {
      employeeId,
      officeDays,
      wfhDays,
      leaveDays,
      workingDays,
      totalWeekdays,
      absentDays,
      attendancePct,
    });
  }
  return result;
}
