"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUser, canAccessTask, hasCompanyWideView, ForbiddenError, logActivity } from "@/lib/authorize";
import { notify, companyWideRecipientIds } from "@/lib/notify";

async function loadAndCheckTask(taskId: string) {
  const user = await requireUser();
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  if (!(await canAccessTask(user, task))) throw new ForbiddenError("Not permitted to access this task");
  return { user, task };
}

export async function reviewTask(taskId: string) {
  const { user, task } = await loadAndCheckTask(taskId);
  if (task.assignedToId !== user.id) throw new Error("Only the assigned developer can review this task");
  if (task.reviewedAt) return;

  await prisma.task.update({ where: { id: taskId }, data: { reviewedAt: new Date() } });
  await logActivity({ actorId: user.id, action: "TASK_REVIEWED", entityType: "Task", entityId: taskId });
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
}

export async function acceptTask(taskId: string) {
  const { user, task } = await loadAndCheckTask(taskId);
  if (task.assignedToId !== user.id) throw new Error("Only the assigned developer can accept this task");

  await prisma.task.update({
    where: { id: taskId },
    data: { reviewedAt: task.reviewedAt ?? new Date(), acceptedAt: new Date() },
  });
  await logActivity({ actorId: user.id, action: "TASK_ACCEPTED", entityType: "Task", entityId: taskId });
  const recipients = await companyWideRecipientIds(user.id);
  await Promise.all(recipients.map((id) => notify(id, "TASK_ACCEPTED", `${user.name ?? "A developer"} accepted: ${task.title}`, { type: "Task", id: taskId })));
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
}

export async function requestClarification(taskId: string, message: string) {
  const { user, task } = await loadAndCheckTask(taskId);
  if (task.assignedToId !== user.id) throw new Error("Only the assigned developer can request clarification");

  await prisma.taskComment.create({ data: { taskId, authorId: user.id, content: message } });
  await prisma.task.update({ where: { id: taskId }, data: { reviewedAt: task.reviewedAt ?? new Date() } });
  await logActivity({ actorId: user.id, action: "TASK_CLARIFICATION_REQUESTED", entityType: "Task", entityId: taskId });
  const recipients = await companyWideRecipientIds(user.id);
  await Promise.all(recipients.map((id) => notify(id, "TASK_CLARIFICATION", `${user.name ?? "A developer"} needs clarification on: ${task.title}`, { type: "Task", id: taskId })));
  revalidatePath(`/tasks/${taskId}`);
}

export async function submitTaskForReview(taskId: string) {
  const { user, task } = await loadAndCheckTask(taskId);
  if (task.assignedToId !== user.id) throw new Error("Only the assigned developer can submit this task for review");

  await prisma.task.update({ where: { id: taskId }, data: { status: "IN_REVIEW" } });
  await logActivity({ actorId: user.id, action: "TASK_STATUS_CHANGED", entityType: "Task", entityId: taskId, metadata: { status: "IN_REVIEW" } as never });
  const recipients = await companyWideRecipientIds(user.id);
  await Promise.all(recipients.map((id) => notify(id, "TASK_NEEDS_REVIEW", `${task.title} is ready for review`, { type: "Task", id: taskId })));
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
}

export async function addTaskComment(taskId: string, content: string) {
  const { user, task } = await loadAndCheckTask(taskId);
  const trimmed = content.trim();
  if (!trimmed) return;

  await prisma.taskComment.create({ data: { taskId, authorId: user.id, content: trimmed } });

  // Notify the other party in the assignment (assignee <-> whoever else is company-wide).
  const notifyIds = new Set<string>();
  if (task.assignedToId && task.assignedToId !== user.id) notifyIds.add(task.assignedToId);
  if (hasCompanyWideView(user)) {
    // PM/Owner commented: notify the assignee only (already added above).
  } else {
    // Developer commented: notify PM/Owner.
    (await companyWideRecipientIds(user.id)).forEach((id) => notifyIds.add(id));
  }
  await Promise.all(
    Array.from(notifyIds).map((id) => notify(id, "TASK_COMMENT", `${user.name ?? "Someone"} commented on: ${task.title}`, { type: "Task", id: taskId }))
  );

  revalidatePath(`/tasks/${taskId}`);
}
