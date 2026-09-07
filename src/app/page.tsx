export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, StatCard, StageBadge, AttendanceBadge, Avatar, fmtHours } from "@/lib/ui";

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export default async function OverviewPage() {
  const today = startOfDay(new Date());

  const [employees, todaysAttendance, projects] = await Promise.all([
    prisma.employee.findMany({ where: { active: true } }),
    prisma.attendance.findMany({
      where: { date: today },
      include: { employee: true },
    }),
    prisma.project.findMany({
      include: { assignments: { include: { employee: true } }, tasks: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const attendanceByEmployee = new Map(todaysAttendance.map((a) => [a.employeeId, a]));
  const present = todaysAttendance.filter((a) => a.status === "PRESENT");
  const onLeave = todaysAttendance.filter((a) => a.status === "LEAVE");
  const noRecord = employees.filter((e) => !attendanceByEmployee.has(e.id));
  const wfh = present.filter((a) => a.workMode === "WFH").length;
  const office = present.filter((a) => a.workMode === "OFFICE").length;

  const activeProjects = projects.filter((p) => p.stage !== "DEPLOYED" && p.stage !== "ON_HOLD");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total employees" value={employees.length} />
        <StatCard label="Present today" value={present.length} hint={`${office} office · ${wfh} WFH`} />
        <StatCard label="On leave" value={onLeave.length + noRecord.length} />
        <StatCard label="Active projects" value={activeProjects.length} hint={`${projects.length} total`} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Today&apos;s attendance</h2>
            <Link href="/attendance" className="text-sm text-[var(--accent)] font-medium hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-3">
            {employees.map((e) => {
              const a = attendanceByEmployee.get(e.id);
              const status = a?.status ?? "LEAVE";
              return (
                <li key={e.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={e.name} color={e.avatarColor} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{e.name}</div>
                      <div className="text-xs text-gray-500 truncate">{e.title}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a?.status === "PRESENT" && (
                      <span className="text-xs text-gray-400">{a.workMode === "WFH" ? "WFH" : "Office"}</span>
                    )}
                    <AttendanceBadge status={status} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Projects in progress</h2>
            <Link href="/projects" className="text-sm text-[var(--accent)] font-medium hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-4">
            {projects.map((p) => {
              const done = p.tasks.filter((t) => t.status === "DONE").length;
              return (
                <li key={p.id}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium truncate">{p.name}</span>
                    <StageBadge stage={p.stage} />
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {p.assignments.length} on team · {done}/{p.tasks.length} tasks done
                    </span>
                    <span>{p.progress}%</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
