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

// ---------- Notification preferences (every user manages only their own) ----------

const EMAIL_PREF_KEYS = [
  "emailEnabled",
  "taskAssigned",
  "taskCompleted",
  "taskBlocked",
  "clarificationRequested",
  "leaveRequested",
  "leaveApproved",
  "leaveRejected",
  "newMessage",
  "dailyWorkUpdate",
  "deadlineReminder",
] as const;

type EmailPrefKey = (typeof EMAIL_PREF_KEYS)[number];

export async function updateMyNotificationPreference(key: EmailPrefKey, value: boolean) {
  const user = await requireUser();
  if (!EMAIL_PREF_KEYS.includes(key)) throw new Error("Invalid preference");

  await prisma.notificationPreference.upsert({
    where: { employeeId: user.id },
    create: { employeeId: user.id, [key]: value } as never,
    update: { [key]: value } as never,
  });
  revalidatePath("/settings");
}
