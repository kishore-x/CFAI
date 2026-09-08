export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Card, StatCard, AttendanceBadge, fmtTime, fmtHours } from "@/lib/ui";
import { AttendanceRow } from "./attendance-row";
import { requireUser, isOwner, isManager, isDeveloper, visibleEmployeeIds } from "@/lib/authorize";

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

export default async function AttendancePage() {
  const user = await requireUser();
  const ids = await visibleEmployeeIds(user);
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
  const absent = rows.length - present.length;

  const heading = isOwner(user) ? "Attendance" : isManager(user) ? "Team Attendance" : "My Attendance";

  // Developer: also show their own recent history.
  let history: { date: Date; status: string; workMode: string; clockIn: Date | null; clockOut: Date | null }[] = [];
  if (isDeveloper(user)) {
    history = await prisma.attendance.findMany({
      where: { employeeId: user.id },
      orderBy: { date: "desc" },
      take: 14,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {today.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {!isDeveloper(user) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Present" value={present.length} />
          <StatCard label="Office" value={office} />
          <StatCard label="WFH" value={wfh} />
          <StatCard label="Absent" value={absent} />
        </div>
      )}

      <Card className="p-5 overflow-x-auto">
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

      {isDeveloper(user) && (
        <Card className="p-5 overflow-x-auto">
          <h2 className="font-semibold mb-3">Recent history</h2>
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Mode</th>
                <th className="pb-2 font-medium">In</th>
                <th className="pb-2 font-medium">Out</th>
                <th className="pb-2 font-medium">Hours</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => {
                const hoursMs = h.clockIn && h.clockOut ? new Date(h.clockOut).getTime() - new Date(h.clockIn).getTime() : null;
                return (
                  <tr key={h.date.toISOString()} className="border-t border-[var(--border)]">
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
