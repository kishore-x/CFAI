import "server-only";
import { prisma } from "@/lib/db";
import { companyWideRecipientIds } from "@/lib/notify";
import { sendDeadlineReminderEmail } from "@/lib/email";

const APPROACHING_WINDOW_DAYS = 2;

// Scans open tasks with a due date and emails a deadline reminder when a
// task is newly "approaching" (due within the window) or newly "overdue".
// Task.deadlineReminderStage dedupes: a task only emails again when it
// crosses into a worse stage than the one it was last reminded for, so this
// can run on a schedule (e.g. daily cron) without spamming the same task.
export async function runDeadlineReminders() {
  const now = new Date();
  const approachingCutoff = new Date(now.getTime() + APPROACHING_WINDOW_DAYS * 86400000);

  const tasks = await prisma.task.findMany({
    where: { status: { not: "COMPLETED" }, dueDate: { not: null } },
    include: { project: { select: { name: true } } },
  });

  const recipientsCache = await companyWideRecipientIds();

  let sent = 0;
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const overdue = task.dueDate < now;
    const approaching = !overdue && task.dueDate <= approachingCutoff;
    if (!overdue && !approaching) continue;

    const targetStage = overdue ? "OVERDUE" : "APPROACHING";
    if (task.deadlineReminderStage === "OVERDUE") continue; // already sent the worst-case reminder
    if (task.deadlineReminderStage === targetStage) continue; // no new stage reached

    const recipients = new Set<string>(recipientsCache);
    if (task.assignedToId) recipients.add(task.assignedToId);

    await Promise.all(
      Array.from(recipients).map((id) =>
        sendDeadlineReminderEmail({
          recipientId: id,
          taskId: task.id,
          taskTitle: task.title,
          projectName: task.project.name,
          dueDate: task.dueDate as Date,
          overdue,
        })
      )
    );

    await prisma.task.update({ where: { id: task.id }, data: { deadlineReminderStage: targetStage } });
    sent++;
  }

  return { checked: tasks.length, sent };
}
