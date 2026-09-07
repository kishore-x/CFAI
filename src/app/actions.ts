"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

function canManage(role: string) {
  return role === "OWNER" || role === "MANAGER";
}

async function getOrCreateTodayAttendance(employeeId: string) {
  const today = startOfDay(new Date());
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });
  if (existing) return existing;
  return prisma.attendance.create({
    data: { employeeId, date: today, status: "PRESENT", workMode: "OFFICE" },
  });
}

async function assertCanEditAttendance(employeeId: string) {
  const user = await requireSession();
  if (employeeId !== user.id && !canManage(user.role)) {
    throw new Error("Not permitted to edit another employee's attendance");
  }
}

export async function clockIn(employeeId: string) {
  await assertCanEditAttendance(employeeId);
  const record = await getOrCreateTodayAttendance(employeeId);
  await prisma.attendance.update({
    where: { id: record.id },
    data: { clockIn: new Date(), status: "PRESENT" },
  });
  revalidatePath("/attendance");
  revalidatePath("/");
}

export async function clockOut(employeeId: string) {
  await assertCanEditAttendance(employeeId);
  const record = await getOrCreateTodayAttendance(employeeId);
  await prisma.attendance.update({
    where: { id: record.id },
    data: { clockOut: new Date() },
  });
  revalidatePath("/attendance");
  revalidatePath("/");
}

export async function setWorkMode(employeeId: string, workMode: "OFFICE" | "WFH") {
  await assertCanEditAttendance(employeeId);
  const record = await getOrCreateTodayAttendance(employeeId);
  await prisma.attendance.update({
    where: { id: record.id },
    data: { workMode },
  });
  revalidatePath("/attendance");
  revalidatePath("/");
}

export async function setLeave(employeeId: string, onLeave: boolean) {
  await assertCanEditAttendance(employeeId);
  const record = await getOrCreateTodayAttendance(employeeId);
  await prisma.attendance.update({
    where: { id: record.id },
    data: { status: onLeave ? "LEAVE" : "PRESENT", clockIn: onLeave ? null : record.clockIn, clockOut: onLeave ? null : record.clockOut },
  });
  revalidatePath("/attendance");
  revalidatePath("/");
}

export async function updateProjectStage(projectId: string, stage: string) {
  const user = await requireSession();
  if (!canManage(user.role)) throw new Error("Only owners and the project manager can change project stage");
  await prisma.project.update({
    where: { id: projectId },
    data: { stage: stage as never },
  });
  revalidatePath("/projects");
  revalidatePath("/");
}

export async function updateProjectProgress(projectId: string, progress: number) {
  const user = await requireSession();
  if (!canManage(user.role)) throw new Error("Only owners and the project manager can change project progress");
  await prisma.project.update({
    where: { id: projectId },
    data: { progress: Math.max(0, Math.min(100, progress)) },
  });
  revalidatePath("/projects");
  revalidatePath("/");
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ error: string } | { error: null }> {
  const user = await requireSession();
  const employee = await prisma.employee.findUniqueOrThrow({ where: { id: user.id } });

  const valid = await verifyPassword(currentPassword, employee.passwordHash);
  if (!valid) return { error: "Current password is incorrect" };
  if (newPassword.length < 8) return { error: "New password must be at least 8 characters" };

  const passwordHash = await hashPassword(newPassword);
  await prisma.employee.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });
  return { error: null };
}
