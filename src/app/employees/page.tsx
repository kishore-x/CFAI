export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, Avatar, AttendanceBadge } from "@/lib/ui";
import { requireUser, isOwner, hasCompanyWideView, visibleEmployeeIds } from "@/lib/authorize";
import { EmployeeControls } from "./employee-controls";
import { AddEmployeeForm } from "./add-employee-form";

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

export default async function EmployeesPage() {
  const user = await requireUser();
  const ids = await visibleEmployeeIds(user);
  const companyWide = hasCompanyWideView(user);
  const today = startOfDay(new Date());

  const employees = await prisma.employee.findMany({
    where: ids === "ALL" ? {} : { id: { in: ids } },
    include: {
      assignments: { where: { active: true }, include: { project: true } },
      assignedTasks: true,
      attendance: { where: { date: today } },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  const heading = companyWide ? "Employees" : "My Profile";
  const subtitle = companyWide ? `${employees.length} team members` : "Your account details";

  if (!companyWide) {
    // Developer: their own profile card only.
    const e = employees[0];
    if (!e) return null;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{subtitle}</p>
        </div>
        <Card className="p-5 max-w-md">
          <div className="flex items-start gap-3">
            <Avatar name={e.name} />
            <div>
              <div className="font-medium">{e.name}</div>
              <div className="text-xs text-[var(--muted)]">{e.title} · {e.department}</div>
              <div className="text-xs text-[var(--muted)] mt-1">{e.email}</div>
              <div className="text-xs text-[var(--muted)] mt-1">{e.role}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md bg-white/5 px-2 py-1.5">
                  <div className="text-[var(--muted)]">GitHub</div>
                  <div className="font-medium truncate">{e.githubUsername ?? "—"}</div>
                </div>
                <div className="rounded-md bg-white/5 px-2 py-1.5">
                  <div className="text-[var(--muted)]">Vercel</div>
                  <div className="font-medium truncate">{e.vercelUsername ?? "—"}</div>
                </div>
                <div className="rounded-md bg-white/5 px-2 py-1.5">
                  <div className="text-[var(--muted)]">Claude</div>
                  <div className="font-medium truncate">{e.claudeAccountLabel ?? "—"}</div>
                </div>
              </div>
              <Link href={`/employees/${e.id}`} className="mt-4 inline-block text-xs text-[var(--accent)] hover:underline">
                View my progress →
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{subtitle}</p>
        </div>
        {isOwner(user) && <AddEmployeeForm />}
      </div>

      <Card className="p-5 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="pb-2 font-medium">Developer</th>
              <th className="pb-2 font-medium">Projects</th>
              <th className="pb-2 font-medium">Today</th>
              <th className="pb-2 font-medium">Mode</th>
              <th className="pb-2 font-medium text-right">Tasks</th>
              <th className="pb-2 font-medium">Progress</th>
              {isOwner(user) && <th className="pb-2 font-medium text-right">Manage</th>}
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => {
              const a = e.attendance[0];
              const total = e.assignedTasks.length;
              const completed = e.assignedTasks.filter((t) => t.status === "COMPLETED").length;
              const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <tr key={e.id} className={`border-t border-[var(--border)] ${!e.active ? "opacity-50" : ""}`}>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <Avatar name={e.name} />
                      <div>
                        <Link href={`/employees/${e.id}`} className="text-sm font-medium hover:underline">
                          {e.name}
                        </Link>
                        <div className="text-xs text-[var(--muted)]">{e.title}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-[var(--muted)] max-w-[180px]">
                    {e.assignments.map((asn) => asn.project.name).join(", ") || "—"}
                  </td>
                  <td className="py-2.5 pr-4">
                    <AttendanceBadge status={a?.status ?? "LEAVE"} />
                  </td>
                  <td className="py-2.5 pr-4 text-sm text-[var(--muted)]">{a?.status === "PRESENT" ? a.workMode : "—"}</td>
                  <td className="py-2.5 pr-4 text-sm text-right">{total}</td>
                  <td className="py-2.5 pr-4 w-32">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs text-[var(--muted)] w-8 text-right">{progress}%</span>
                    </div>
                  </td>
                  {isOwner(user) && (
                    <td className="py-2.5 text-right">
                      <EmployeeControls employeeId={e.id} role={e.role} active={e.active} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
