export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, AttendanceBadge, fmtTime, fmtHours, StatCard } from "@/lib/ui";
import { requireUser, canAccessEmployee } from "@/lib/authorize";
import { monthlyAttendanceStats } from "@/lib/attendance-stats";

export default async function EmployeeAttendanceHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { employeeId } = await params;
  const user = await requireUser();
  if (!(await canAccessEmployee(user, employeeId))) notFound();

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) notFound();

  const sp = await searchParams;
  const now = new Date();
  const year = sp.year ? Number(sp.year) : now.getUTCFullYear();
  const month = sp.month ? Number(sp.month) : now.getUTCMonth() + 1;

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));

  const [history, stats] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId, date: { gte: monthStart, lte: monthEnd } },
      orderBy: { date: "desc" },
    }),
    monthlyAttendanceStats([employeeId], year, month),
  ]);

  const s = stats.get(employeeId);
  const monthLabel = monthStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{employee.name} — Attendance</h1>
        <p className="text-sm text-[var(--muted)] mt-1">{monthLabel}</p>
      </div>

      {s && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Office days" value={s.officeDays} />
          <StatCard label="WFH days" value={s.wfhDays} />
          <StatCard label="Leave days" value={s.leaveDays} />
          <StatCard label="Attendance %" value={`${s.attendancePct}%`} />
        </div>
      )}

      <Card className="p-5 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Mode</th>
              <th className="pb-2 font-medium">In</th>
              <th className="pb-2 font-medium">Out</th>
              <th className="pb-2 font-medium">Duration</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => {
              const hoursMs = h.clockIn && h.clockOut ? new Date(h.clockOut).getTime() - new Date(h.clockIn).getTime() : null;
              return (
                <tr key={h.id} className="border-t border-[var(--border)]">
                  <td className="py-2.5 pr-4 text-sm">{new Date(h.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td>
                  <td className="py-2.5 pr-4">
                    <AttendanceBadge status={h.status} />
                  </td>
                  <td className="py-2.5 pr-4 text-sm text-[var(--muted)]">{h.status === "PRESENT" ? h.workMode : "—"}</td>
                  <td className="py-2.5 pr-4 text-sm">{fmtTime(h.clockIn)}</td>
                  <td className="py-2.5 pr-4 text-sm">{fmtTime(h.clockOut)}</td>
                  <td className="py-2.5 pr-4 text-sm">{hoursMs !== null ? fmtHours(hoursMs) : "—"}</td>
                </tr>
              );
            })}
            {history.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-[var(--muted)]">
                  No attendance records for this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
