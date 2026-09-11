"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/authorize";

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

export async function submitDailyUpdate(input: { completed?: string; inProgress?: string; blocked?: string; tomorrow?: string }) {
  const user = await requireUser();
  const today = startOfDay(new Date());

  await prisma.dailyWorkUpdate.upsert({
    where: { employeeId_date: { employeeId: user.id, date: today } },
    create: { employeeId: user.id, date: today, ...input },
    update: { ...input },
  });
  revalidatePath("/daily-updates");
  revalidatePath("/");
}
