export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Card, Avatar } from "@/lib/ui";
import { requireUser, isOwner, isManager, visibleEmployeeIds } from "@/lib/authorize";
import { EmployeeControls } from "./employee-controls";
import { AddEmployeeForm } from "./add-employee-form";

export default async function EmployeesPage() {
  const user = await requireUser();
  const ids = await visibleEmployeeIds(user);

  const employees = await prisma.employee.findMany({
    where: ids === "ALL" ? {} : { id: { in: ids } },
    include: {
      assignments: { where: { active: true }, include: { project: true } },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  const heading = isOwner(user) ? "Employees" : isManager(user) ? "My Team" : "My Profile";
  const subtitle = isOwner(user)
    ? `${employees.length} team members`
    : isManager(user)
      ? `${employees.length} people across your projects`
      : "Your account details";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{subtitle}</p>
        </div>
        {isOwner(user) && <AddEmployeeForm />}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {employees.map((e) => (
          <Card key={e.id} className={`p-5 ${!e.active ? "opacity-50" : ""}`}>
            <div className="flex items-start gap-3">
              <Avatar name={e.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {e.name}
                      {!e.active && <span className="text-[10px] uppercase text-[var(--muted)] border border-[var(--border)] rounded px-1.5 py-0.5">Inactive</span>}
                    </div>
                    <div className="text-xs text-[var(--muted)]">{e.title} · {e.department}</div>
                  </div>
                </div>
                <div className="text-xs text-[var(--muted)] mt-1">{e.email}</div>
                <div className="text-xs text-[var(--muted)] mt-1">{e.role}</div>

                {(isOwner(user) || isManager(user) || e.id === user.id) && (
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
                )}

                {e.assignments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {e.assignments.map((a) => (
                      <span
                        key={a.id}
                        className="text-xs px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--foreground)]"
                      >
                        {a.project.name}
                      </span>
                    ))}
                  </div>
                )}

                {isOwner(user) && (
                  <div className="mt-4">
                    <EmployeeControls employeeId={e.id} role={e.role} active={e.active} />
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
