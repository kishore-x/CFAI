export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Card, Avatar } from "@/lib/ui";

export default async function EmployeesPage() {
  const employees = await prisma.employee.findMany({
    where: { active: true },
    include: { assignments: { include: { project: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-gray-500 mt-1">{employees.length} active team members</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {employees.map((e) => (
          <Card key={e.id} className="p-5">
            <div className="flex items-start gap-3">
              <Avatar name={e.name} color={e.avatarColor} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-xs text-gray-500">{e.title} · {e.department}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-1">{e.email}</div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-md bg-gray-50 px-2 py-1.5">
                    <div className="text-gray-400">GitHub</div>
                    <div className="font-medium truncate">{e.githubUsername ?? "—"}</div>
                  </div>
                  <div className="rounded-md bg-gray-50 px-2 py-1.5">
                    <div className="text-gray-400">Vercel</div>
                    <div className="font-medium truncate">{e.vercelUsername ?? "—"}</div>
                  </div>
                  <div className="rounded-md bg-gray-50 px-2 py-1.5">
                    <div className="text-gray-400">Claude</div>
                    <div className="font-medium truncate">{e.claudeAccountLabel ?? "—"}</div>
                  </div>
                </div>

                {e.assignments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {e.assignments.map((a) => (
                      <span
                        key={a.id}
                        className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700"
                      >
                        {a.project.name}
                      </span>
                    ))}
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
