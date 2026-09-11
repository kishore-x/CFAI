"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/authorize";
import { companyWideRecipientIds } from "@/lib/notify";
import { sendDailyWorkUpdateEmail } from "@/lib/email";

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

export async function submitDailyUpdate(input: { completed?: string; inProgress?: string; blocked?: string; tomorrow?: string }) {
  const user = await requireUser();
  const today = startOfDay(new Date());

  const existing = await prisma.dailyWorkUpdate.findUnique({
    where: { employeeId_date: { employeeId: user.id, date: today } },
  });

  await prisma.dailyWorkUpdate.upsert({
    where: { employeeId_date: { employeeId: user.id, date: today } },
    create: { employeeId: user.id, date: today, ...input },
    update: { ...input },
  });

  // Only email on the day's first submission — re-editing the same day's
  // update later shouldn't re-notify the PM every time.
  if (existing) {
    revalidatePath("/daily-updates");
    revalidatePath("/");
    return;
  }

  const recipients = await companyWideRecipientIds(user.id);
  await Promise.all(
    recipients.map((id) =>
      sendDailyWorkUpdateEmail({
        recipientId: id,
        developerName: user.name ?? "A developer",
        date: today,
        completed: input.completed,
        inProgress: input.inProgress,
        blocked: input.blocked,
        tomorrow: input.tomorrow,
      })
    )
  );

  revalidatePath("/daily-updates");
  revalidatePath("/");
}
