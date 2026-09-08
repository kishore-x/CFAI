export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, StatCard, AttendanceBadge } from "@/lib/ui";
import { AttendanceRow } from "./attendance-row";
import { MonthSelector } from "./month-selector";
import { requireUser, isOwner, isManager, isDeveloper, hasCompanyWideView, visibleEmployeeIds } from "@/lib/authorize";
import { monthlyAttendanceStats } from "@/lib/attendance-stats";

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const user = await requireUser();
  const ids = await visibleEmployeeIds(user);
  const companyWide = hasCompanyWideView(user);
  const today = startOfDay(new Date());

  const employees = await prisma.employee.findMany({
    where: { active: true, ...(ids === "ALL" ? {} : { id: { in: ids } }) },
    include: {
      attendance: { where: { date: today } },
      assignments: { where: { active: true }, include: { project: true } },
    },
    orderBy: { name: "asc" },
  });

  const rows = employees.map((e) => {
    const a = e.attendance[0];
    return {
      employeeId: e.id,
      name: e.name,
      title: e.title,
      status: a?.status ?? "LEAVE",
      workMode: a?.workMode ?? "OFFICE",
      clockIn: a?.clockIn ?? null,
      clockOut: a?.clockOut ?? null,
      project: e.assignments[0]?.project.name ?? null,
    };
  });

  const canEditOthers = isOwner(user) || isManager(user);
  const present = rows.filter((r) => r.status === "PRESENT");
  const office = present.filter((r) => r.workMode === "OFFICE").length;
  const wfh = present.filter((r) => r.workMode === "WFH").length;
  const onLeave = rows.filter((r) => r.status === "LEAVE").length;
  const trueAbsent = Math.max(rows.length - present.length - onLeave, 0);

  const heading = companyWide ? "Attendance" : "My Attendance";

  // Developer: personal recent history + this month's totals.
  let history: { date: Date; status: string; workMode: string; clockIn: Date | null; clockOut: Date | null }[] = [];
  let ownMonthStats: { officeDays: number; wfhDays: number; leaveDays: number; attendancePct: number } | null = null;
  if (isDeveloper(user)) {
    const now = new Date();
    const [h, statsMap] = await Promise.all([
      prisma.attendance.findMany({ where: { employeeId: user.id }, orderBy: { date: "desc" }, take: 14 }),
      monthlyAttendanceStats([user.id], now.getUTCFullYear(), now.getUTCMonth() + 1),
    ]);
    history = h;
    ownMonthStats = statsMap.get(user.id) ?? null;
  }

  // Company-wide: monthly team attendance table.
  let monthStats: Awaited<ReturnType<typeof monthlyAttendanceStats>> = new Map();
  const sp = await searchParams;
  const now = new Date();
  const year = sp.year ? Number(sp.year) : now.getUTCFullYear();
  const month = sp.month ? Number(sp.month) : now.getUTCMonth() + 1;
  if (companyWide) {
    monthStats = await monthlyAttendanceStats(employees.map((e) => e.id), year, month);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {today.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {companyWide && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Present" value={present.length} />
          <StatCard label="Office" value={office} />
          <StatCard label="WFH" value={wfh} />
          <StatCard label="On leave" value={onLeave} />
          <StatCard label="Absent" value={trueAbsent} />
        </div>
      )}

      {isDeveloper(user) && ownMonthStats && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Office (this month)" value={ownMonthStats.officeDays} />
          <StatCard label="WFH (this month)" value={ownMonthStats.wfhDays} />
          <StatCard label="Leave (this month)" value={ownMonthStats.leaveDays} />
        </div>
      )}

      <Card className="p-5 overflow-x-auto">
        <h2 className="font-semibold mb-3">Today</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="pb-2 font-medium">Employee</th>
              {!isDeveloper(user) && <th className="pb-2 font-medium">Project</th>}
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Mode</th>
              <th className="pb-2 font-medium">In</th>
              <th className="pb-2 font-medium">Out</th>
              <th className="pb-2 font-medium">Hours</th>
              <th className="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <AttendanceRow
                key={row.employeeId}
                row={row}
                editable={canEditOthers || row.employeeId === user.id}
                showProject={!isDeveloper(user)}
              />
            ))}
          </tbody>
        </table>
      </Card>

      {companyWide && (
        <Card className="p-5 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Team attendance</h2>
            <MonthSelector year={year} month={month} />
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="pb-2 font-medium">Developer</th>
                <th className="pb-2 font-medium text-right">Office</th>
                <th className="pb-2 font-medium text-right">WFH</th>
                <th className="pb-2 font-medium text-right">Leave</th>
                <th className="pb-2 font-medium text-right">Working days</th>
                <th className="pb-2 font-medium text-right">Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => {
                const s = monthStats.get(e.id);
                if (!s) return null;
                return (
                  <tr key={e.id} className="border-t border-[var(--border)]">
                    <td className="py-2.5 pr-4 text-sm">
                      <Link href={`/attendance/${e.id}`} className="hover:underline">
                        {e.name}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-sm text-right">{s.officeDays}</td>
                    <td className="py-2.5 pr-4 text-sm text-right">{s.wfhDays}</td>
                    <td className="py-2.5 pr-4 text-sm text-right">{s.leaveDays}</td>
                    <td className="py-2.5 pr-4 text-sm text-right">{s.workingDays}</td>
                    <td className="py-2.5 pr-4 text-sm text-right">{s.attendancePct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {isDeveloper(user) && (
        <Card className="p-5 overflow-x-auto">
          <h2 className="font-semibold mb-3">Recent history</h2>
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Mode</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.date.toISOString()} className="border-t border-[var(--border)]">
                  <td className="py-2.5 pr-4 text-sm">{new Date(h.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td>
                  <td className="py-2.5 pr-4">
                    <AttendanceBadge status={h.status} />
                  </td>
                  <td className="py-2.5 pr-4 text-sm text-[var(--muted)]">{h.status === "PRESENT" ? h.workMode : "—"}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-sm text-[var(--muted)]">
                    No attendance history yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
