export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, ProjectStatusBadge } from "@/lib/ui";
import { CreateProjectForm } from "./create-project-form";
import { AssignTaskForm } from "@/app/tasks/assign-task-form";
import { requireUser, isOwner, hasCompanyWideView, visibleProjectIds } from "@/lib/authorize";

export default async function ProjectsPage() {
  const user = await requireUser();
  const ids = await visibleProjectIds(user);

  const projects = await prisma.project.findMany({
    where: ids === "ALL" ? {} : { id: { in: ids } },
    include: {
      manager: { select: { id: true, name: true } },
      assignments: { where: { active: true }, include: { employee: { select: { id: true, name: true } } } },
      tasks: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const companyWide = hasCompanyWideView(user);
  const allEmployees = companyWide
    ? await prisma.employee.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];
  const managers = isOwner(user)
    ? await prisma.employee.findMany({ where: { active: true, role: { in: ["OWNER", "MANAGER"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];

  const heading = companyWide ? "Projects" : "My Projects";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{projects.length} projects</p>
        </div>
        {companyWide && (
          <div className="flex items-center gap-2">
            <AssignTaskForm projects={projects.map((p) => ({ id: p.id, name: p.name }))} employees={allEmployees} />
            <CreateProjectForm managers={managers} />
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {projects.map((p) => {
          const done = p.tasks.filter((t) => t.status === "COMPLETED").length;
          const blocked = p.tasks.filter((t) => t.status === "BLOCKED").length;
          const overdue = p.tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED").length;
          const progress = p.progressOverride ?? (p.tasks.length > 0 ? Math.round((done / p.tasks.length) * 100) : 0);

          return (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="p-5 h-full hover:border-white/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold">{p.name}</h2>
                      <ProjectStatusBadge status={p.status} />
                    </div>
                    {p.client && <div className="text-xs text-[var(--muted)] mt-0.5">{p.client}</div>}
                    {p.manager && <div className="text-xs text-[var(--muted)] mt-1">Managed by {p.manager.name}</div>}
                  </div>
                  <span className="text-sm text-[var(--muted)] shrink-0">{progress}%</span>
                </div>

                <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${progress}%` }} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                  <span>{done}/{p.tasks.length} tasks done</span>
                  <span>{p.assignments.length} on team</span>
                  {blocked > 0 && <span className="text-white">{blocked} blocked</span>}
                  {overdue > 0 && <span className="text-red-400">{overdue} overdue</span>}
                  {p.deadline && <span>Due {new Date(p.deadline).toLocaleDateString("en-GB")}</span>}
                </div>

                {(p.githubRepoUrl || p.vercelProjectUrl || p.claudeAccountName) && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                    {p.githubRepoUrl && <span>GitHub ↗</span>}
                    {p.vercelProjectUrl && <span>Vercel ↗</span>}
                    {p.claudeAccountName && <span>Claude</span>}
                  </div>
                )}
              </Card>
            </Link>
          );
        })}

        {projects.length === 0 && (
          <Card className="p-8 text-center text-sm text-[var(--muted)] md:col-span-2">
            No projects to show yet.
          </Card>
        )}
      </div>
    </div>
  );
}
