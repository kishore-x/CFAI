export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Card } from "@/lib/ui";
import { AttendanceRow } from "./attendance-row";

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

export default async function AttendancePage() {
  const today = startOfDay(new Date());
  const employees = await prisma.employee.findMany({
    where: { active: true },
    include: { attendance: { where: { date: today } } },
    orderBy: { name: "asc" },
  });

  const rows = employees.map((e) => {
    const a = e.attendance[0];
    return {
      employeeId: e.id,
      name: e.name,
      title: e.title,
      avatarColor: e.avatarColor,
      status: a?.status ?? "LEAVE",
      workMode: a?.workMode ?? "OFFICE",
      clockIn: a?.clockIn ?? null,
      clockOut: a?.clockOut ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {today.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <Card className="p-5 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="pb-2 font-medium">Employee</th>
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
              <AttendanceRow key={row.employeeId} row={row} />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
