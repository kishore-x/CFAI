export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, Avatar } from "@/lib/ui";
import { requireUser, hasCompanyWideView } from "@/lib/authorize";

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

export default async function DailyUpdatesPage() {
  const user = await requireUser();
  if (!hasCompanyWideView(user)) notFound();

  const today = startOfDay(new Date());
  const [employees, updates] = await Promise.all([
    prisma.employee.findMany({ where: { active: true, role: "DEVELOPER" }, orderBy: { name: "asc" } }),
    prisma.dailyWorkUpdate.findMany({ where: { date: today } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Daily Updates</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {today.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {employees.map((e) => {
          const u = updates.find((x) => x.employeeId === e.id);
          return (
            <Card key={e.id} className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Avatar name={e.name} />
                <div className="font-medium text-sm">{e.name}</div>
              </div>
              {u ? (
                <div className="space-y-2 text-sm">
                  {u.completed && (
                    <div>
                      <div className="text-xs text-[var(--muted)]">Completed</div>
                      <div>{u.completed}</div>
                    </div>
                  )}
                  {u.inProgress && (
                    <div>
                      <div className="text-xs text-[var(--muted)]">In progress</div>
                      <div>{u.inProgress}</div>
                    </div>
                  )}
                  {u.blocked && (
                    <div>
                      <div className="text-xs text-[var(--muted)]">Blocked</div>
                      <div className="text-red-400">{u.blocked}</div>
                    </div>
                  )}
                  {u.tomorrow && (
                    <div>
                      <div className="text-xs text-[var(--muted)]">Tomorrow</div>
                      <div>{u.tomorrow}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-[var(--muted)]">No update submitted yet.</div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
