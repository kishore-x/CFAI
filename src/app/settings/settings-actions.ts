"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUser, assertOwner } from "@/lib/authorize";

export async function upsertLeavePolicy(input: {
  id?: string;
  name: string;
  period: "MONTHLY" | "ANNUAL";
  monthlyAllowance?: number | null;
  annualAllowance?: number | null;
  carryForward: boolean;
  maxCarryForward?: number | null;
}) {
  const user = await requireUser();
  await assertOwner(user);

  if (input.id) {
    await prisma.leavePolicy.update({
      where: { id: input.id },
      data: {
        name: input.name,
        period: input.period,
        monthlyAllowance: input.monthlyAllowance ?? null,
        annualAllowance: input.annualAllowance ?? null,
        carryForward: input.carryForward,
        maxCarryForward: input.maxCarryForward ?? null,
        updatedById: user.id,
      },
    });
  } else {
    await prisma.leavePolicy.create({
      data: {
        name: input.name,
        period: input.period,
        monthlyAllowance: input.monthlyAllowance ?? null,
        annualAllowance: input.annualAllowance ?? null,
        carryForward: input.carryForward,
        maxCarryForward: input.maxCarryForward ?? null,
        updatedById: user.id,
      },
    });
  }
  revalidatePath("/settings");
  revalidatePath("/leave");
}

export async function setLeavePolicyActive(id: string, active: boolean) {
  const user = await requireUser();
  await assertOwner(user);
  await prisma.leavePolicy.update({ where: { id }, data: { active, updatedById: user.id } });
  revalidatePath("/settings");
  revalidatePath("/leave");
}

export async function updateAttendanceConfig(officeStartTime: string, graceMinutes: number) {
  const user = await requireUser();
  await assertOwner(user);
  await prisma.attendanceConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", officeStartTime, graceMinutes },
    update: { officeStartTime, graceMinutes },
  });
  revalidatePath("/settings");
  revalidatePath("/");
}
