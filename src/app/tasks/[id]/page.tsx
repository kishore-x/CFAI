export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, TaskStatusBadge, TaskPriorityLabel } from "@/lib/ui";
import { requireUser, canAccessTask, hasCompanyWideView } from "@/lib/authorize";
import { TaskStatusSelect } from "../task-status-select";
import { TaskLifecycleActions } from "../task-lifecycle-actions";
import { TaskComments } from "../task-comments";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const task = await prisma.task.findUnique({
    where: { id },
    include: { project: true, assignedTo: true, createdBy: true, comments: { include: { author: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!task) notFound();
  if (!(await canAccessTask(user, task))) notFound();

  const activity = await prisma.activityLog.findMany({
    where: { entityType: "Task", entityId: id },
    include: { actor: true },
    orderBy: { createdAt: "asc" },
  });

  const editable = hasCompanyWideView(user) || task.assignedToId === user.id;
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "COMPLETED";

  const ACTION_LABEL: Record<string, string> = {
    TASK_CREATED: "created this task",
    TASK_ASSIGNED: "reassigned this task",
    TASK_REVIEWED: "reviewed this task",
    TASK_ACCEPTED: "accepted this task",
    TASK_CLARIFICATION_REQUESTED: "requested clarification",
    TASK_STATUS_CHANGED: "changed the status",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
            <TaskStatusBadge status={task.status} />
          </div>
          <div className="text-sm text-[var(--muted)] mt-1">
            <Link href={`/projects/${task.projectId}`} className="hover:underline">
              {task.project.name}
            </Link>
          </div>
          {task.description && <div className="text-sm text-[var(--muted)] mt-2 max-w-xl">{task.description}</div>}
        </div>
        {editable && <TaskStatusSelect taskId={task.id} status={task.status} editable={editable} />}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-xs text-[var(--muted)]">Assigned to</div>
          <div>{task.assignedTo?.name ?? "Unassigned"}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--muted)]">Assigned by</div>
          <div>{task.createdBy.name}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--muted)]">Priority</div>
          <TaskPriorityLabel priority={task.priority} />
        </div>
        <div>
          <div className="text-xs text-[var(--muted)]">Due date</div>
          <div className={overdue ? "text-red-400" : ""}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-GB") : "—"}</div>
        </div>
      </div>

      <TaskLifecycleActions
        taskId={task.id}
        isAssignee={task.assignedToId === user.id}
        reviewedAt={task.reviewedAt ? task.reviewedAt.toISOString() : null}
        acceptedAt={task.acceptedAt ? task.acceptedAt.toISOString() : null}
        status={task.status}
      />

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Activity</h2>
        <ul className="space-y-2 text-sm">
          {activity.map((a) => (
            <li key={a.id} className="flex items-center justify-between text-[var(--muted)]">
              <span>
                <span className="text-[var(--foreground)]">{a.actor.name}</span> {ACTION_LABEL[a.action] ?? a.action.toLowerCase().replace(/_/g, " ")}
              </span>
              <span className="text-xs">{new Date(a.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </li>
          ))}
          {activity.length === 0 && <li className="text-[var(--muted)]">No activity yet.</li>}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Comments</h2>
        <TaskComments
          taskId={task.id}
          comments={task.comments.map((c) => ({
            id: c.id,
            content: c.content,
            authorName: c.author.name,
            createdAt: new Date(c.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
          }))}
        />
      </Card>
    </div>
  );
}
