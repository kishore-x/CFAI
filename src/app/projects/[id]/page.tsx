export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, StatCard, ProjectStatusBadge } from "@/lib/ui";
import { requireUser, canAccessProject, canManageProject } from "@/lib/authorize";
import { ProjectStatusControl } from "../project-status-control";
import { MemberList } from "../member-list";
import { TaskList } from "../task-list";
import { MilestoneList } from "../milestone-list";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!(await canAccessProject(user, id))) notFound();

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      manager: { select: { id: true, name: true } },
      assignments: { where: { active: true }, include: { employee: { select: { id: true, name: true } } } },
      tasks: { orderBy: { createdAt: "asc" }, include: { assignedTo: { select: { id: true, name: true } } } },
    },
  });
  if (!project) notFound();

  const canManage = canManageProject(user);
  const done = project.tasks.filter((t) => t.status === "COMPLETED").length;
  const inProgress = project.tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const todo = project.tasks.filter((t) => t.status === "TODO").length;
  const blocked = project.tasks.filter((t) => t.status === "BLOCKED").length;
  const overdue = project.tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED").length;
  const progress = project.progressOverride ?? (project.tasks.length > 0 ? Math.round((done / project.tasks.length) * 100) : 0);

  const allEmployees = canManage
    ? await prisma.employee.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];

  const activity = await prisma.activityLog.findMany({
    where: { entityType: "Project", entityId: id },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const milestones = await prisma.milestone.findMany({ where: { projectId: id }, orderBy: [{ order: "asc" }, { dueDate: "asc" }] });

  let deadlineNote: { icon: string; text: string } | null = null;
  if (project.deadline) {
    const now = new Date();
    const daysRemaining = Math.ceil((project.deadline.getTime() - now.getTime()) / 86400000);
    if (daysRemaining < 0 && project.status !== "COMPLETED") deadlineNote = { icon: "🔴", text: "Project overdue" };
    else if (daysRemaining <= 7 && project.status !== "COMPLETED") deadlineNote = { icon: "⚠", text: `Deadline approaching — ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining` };
    else if (project.status !== "COMPLETED") deadlineNote = { icon: "", text: `${daysRemaining} days remaining` };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.client && <div className="text-sm text-[var(--muted)] mt-1">{project.client}</div>}
          {project.description && <div className="text-sm text-[var(--muted)] mt-2 max-w-xl">{project.description}</div>}
          {project.manager && <div className="text-xs text-[var(--muted)] mt-2">Managed by {project.manager.name}</div>}
        </div>
        {canManage && <ProjectStatusControl projectId={project.id} status={project.status} progressOverride={project.progressOverride} />}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Progress</h2>
          <span className="text-sm text-[var(--muted)]">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${progress}%` }} />
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total tasks" value={project.tasks.length} />
        <StatCard label="Completed" value={done} />
        <StatCard label="In progress" value={inProgress} />
        <StatCard label="Todo" value={todo} />
        <StatCard label="Blocked" value={blocked} />
      </div>

      {overdue > 0 && (
        <Card className="p-4 border-red-400/40">
          <span className="text-sm text-red-400">🔴 {overdue} task{overdue > 1 ? "s" : ""} overdue</span>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4 text-sm text-[var(--muted)]">
        {project.startDate && <div>Started: {new Date(project.startDate).toLocaleDateString("en-GB")}</div>}
        {project.deadline && (
          <div>
            Deadline: {new Date(project.deadline).toLocaleDateString("en-GB")}
            {deadlineNote && (
              <span className={deadlineNote.icon === "🔴" ? "text-red-400 ml-2" : deadlineNote.icon === "⚠" ? "text-white ml-2" : "ml-2"}>
                {deadlineNote.icon} {deadlineNote.text}
              </span>
            )}
          </div>
        )}
        {project.githubRepoUrl && (
          <a href={project.githubRepoUrl} target="_blank" className="text-[var(--accent)] hover:underline">
            GitHub repo
          </a>
        )}
        {project.vercelProjectUrl && (
          <a href={project.vercelProjectUrl} target="_blank" className="text-[var(--accent)] hover:underline">
            Vercel project
          </a>
        )}
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Milestones</h2>
        <MilestoneList
          projectId={project.id}
          milestones={milestones.map((m) => ({ id: m.id, name: m.name, status: m.status, progress: m.progress, dueDate: m.dueDate ? m.dueDate.toISOString() : null }))}
          canManage={canManage}
        />
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-1">Team</h2>
        <MemberList
          projectId={project.id}
          members={project.assignments.map((a) => ({ id: a.employee.id, name: a.employee.name, role: a.role }))}
          candidates={allEmployees}
          canManage={canManage}
        />
      </Card>

      <Card className="p-5">
        <TaskList
          projectId={project.id}
          tasks={project.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
            assignedToId: t.assignedToId,
            assignedToName: t.assignedTo?.name ?? null,
          }))}
          members={project.assignments.map((a) => ({ id: a.employee.id, name: a.employee.name }))}
          canManage={canManage}
          currentUserId={user.id}
        />
      </Card>

      {canManage && activity.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Recent activity</h2>
          <ul className="space-y-2 text-sm">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-[var(--muted)]">
                <span>
                  <span className="text-[var(--foreground)]">{a.actor.name}</span> {a.action.toLowerCase().replace(/_/g, " ")}
                </span>
                <span className="text-xs">{new Date(a.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
