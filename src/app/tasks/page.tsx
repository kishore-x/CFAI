export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { StatCard } from "@/lib/ui";
import { requireUser, hasCompanyWideView } from "@/lib/authorize";
import { AssignTaskForm } from "./assign-task-form";
import { TaskFilters } from "./task-filters";
import { TaskViewToggle } from "./view-toggle";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; developer?: string; status?: string; priority?: string }>;
}) {
  const user = await requireUser();
  const companyWide = hasCompanyWideView(user);
  const sp = await searchParams;

  const where: Record<string, unknown> = companyWide ? {} : { assignedToId: user.id };
  if (companyWide) {
    if (sp.project) where.projectId = sp.project;
    if (sp.developer) where.assignedToId = sp.developer === "unassigned" ? null : sp.developer;
    if (sp.status) where.status = sp.status;
    if (sp.priority) where.priority = sp.priority;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: { project: true, assignedTo: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  const allForCounts = companyWide ? await prisma.task.findMany() : tasks;
  const counts = {
    completed: allForCounts.filter((t) => t.status === "COMPLETED").length,
    inProgress: allForCounts.filter((t) => t.status === "IN_PROGRESS").length,
    inReview: allForCounts.filter((t) => t.status === "IN_REVIEW").length,
    blocked: allForCounts.filter((t) => t.status === "BLOCKED").length,
    todo: allForCounts.filter((t) => t.status === "TODO").length,
  };

  let projects: { id: string; name: string }[] = [];
  let employees: { id: string; name: string }[] = [];
  if (companyWide) {
    [projects, employees] = await Promise.all([
      prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.employee.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{companyWide ? "Tasks" : "My Tasks"}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{tasks.length} tasks</p>
        </div>
        {companyWide && <AssignTaskForm projects={projects} employees={employees} />}
      </div>

      {companyWide && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Completed" value={counts.completed} />
            <StatCard label="In progress" value={counts.inProgress} />
            <StatCard label="In review" value={counts.inReview} />
            <StatCard label="Blocked" value={counts.blocked} />
            <StatCard label="Todo" value={counts.todo} />
          </div>
          <TaskFilters projects={projects} employees={employees} current={sp} />
        </>
      )}

      <TaskViewToggle
        tasks={tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          assignedToId: t.assignedToId,
          assignedToName: t.assignedTo?.name ?? null,
          projectName: t.project.name,
        }))}
        companyWide={companyWide}
        currentUserId={user.id}
      />
    </div>
  );
}
