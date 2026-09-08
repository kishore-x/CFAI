export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Card, ProjectStatusBadge } from "@/lib/ui";
import { ProjectStatusControl } from "./project-status-control";
import { TaskList } from "./task-list";
import { MemberList } from "./member-list";
import { CreateProjectForm } from "./create-project-form";
import { AssignTaskForm } from "@/app/tasks/assign-task-form";
import { requireUser, isOwner, isManager, hasCompanyWideView, canManageProject, visibleProjectIds } from "@/lib/authorize";

export default async function ProjectsPage() {
  const user = await requireUser();
  const ids = await visibleProjectIds(user);

  const projects = await prisma.project.findMany({
    where: ids === "ALL" ? {} : { id: { in: ids } },
    include: {
      manager: { select: { id: true, name: true } },
      assignments: { where: { active: true }, include: { employee: { select: { id: true, name: true } } } },
      tasks: { orderBy: { createdAt: "asc" }, include: { assignedTo: { select: { id: true, name: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // For "add member" / "create task assignee" dropdowns.
  const allEmployees = isOwner(user) || isManager(user)
    ? await prisma.employee.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];
  const managers = isOwner(user)
    ? await prisma.employee.findMany({ where: { active: true, role: { in: ["OWNER", "MANAGER"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];

  const companyWide = hasCompanyWideView(user);
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

      <div className="space-y-4">
        {projects.map((p) => {
          const done = p.tasks.filter((t) => t.status === "COMPLETED").length;
          const progress = p.progressOverride ?? (p.tasks.length > 0 ? Math.round((done / p.tasks.length) * 100) : 0);
          const canManage = canManageProject(user);

          return (
            <Card key={p.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{p.name}</h2>
                    <ProjectStatusBadge status={p.status} />
                  </div>
                  {p.client && <div className="text-xs text-[var(--muted)] mt-0.5">{p.client}</div>}
                  {p.description && <div className="text-sm text-[var(--muted)] mt-2">{p.description}</div>}
                  {p.manager && (
                    <div className="text-xs text-[var(--muted)] mt-1">Managed by {p.manager.name}</div>
                  )}
                </div>
                {canManage && (
                  <ProjectStatusControl projectId={p.id} status={p.status} progressOverride={p.progressOverride} />
                )}
              </div>

              <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${progress}%` }} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
                {p.startDate && <span>Started: {new Date(p.startDate).toLocaleDateString("en-GB")}</span>}
                {p.deadline && <span>Deadline: {new Date(p.deadline).toLocaleDateString("en-GB")}</span>}
                <span>{done}/{p.tasks.length} tasks done · {progress}%</span>
                {p.githubRepoUrl && (
                  <a href={p.githubRepoUrl} target="_blank" className="text-[var(--accent)] hover:underline">
                    GitHub repo
                  </a>
                )}
                {p.vercelProjectUrl && (
                  <a href={p.vercelProjectUrl} target="_blank" className="text-[var(--accent)] hover:underline">
                    Vercel project
                  </a>
                )}
              </div>

              <MemberList
                projectId={p.id}
                members={p.assignments.map((a) => ({ id: a.employee.id, name: a.employee.name, role: a.role }))}
                candidates={allEmployees}
                canManage={canManage}
              />

              <TaskList
                projectId={p.id}
                tasks={p.tasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  status: t.status,
                  priority: t.priority,
                  dueDate: t.dueDate,
                  assignedToId: t.assignedToId,
                  assignedToName: t.assignedTo?.name ?? null,
                }))}
                members={p.assignments.map((a) => ({ id: a.employee.id, name: a.employee.name }))}
                canManage={canManage}
                currentUserId={user.id}
              />
            </Card>
          );
        })}

        {projects.length === 0 && (
          <Card className="p-8 text-center text-sm text-[var(--muted)]">
            No projects to show yet.
          </Card>
        )}
      </div>
    </div>
  );
}
