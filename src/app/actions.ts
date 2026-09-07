"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
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

export async function clockIn(employeeId: string) {
  const record = await getOrCreateTodayAttendance(employeeId);
  await prisma.attendance.update({
    where: { id: record.id },
    data: { clockIn: new Date(), status: "PRESENT" },
  });
  revalidatePath("/attendance");
  revalidatePath("/");
}

export async function clockOut(employeeId: string) {
  const record = await getOrCreateTodayAttendance(employeeId);
  await prisma.attendance.update({
    where: { id: record.id },
    data: { clockOut: new Date() },
  });
  revalidatePath("/attendance");
  revalidatePath("/");
}

export async function setWorkMode(employeeId: string, workMode: "OFFICE" | "WFH") {
  const record = await getOrCreateTodayAttendance(employeeId);
  await prisma.attendance.update({
    where: { id: record.id },
    data: { workMode },
  });
  revalidatePath("/attendance");
  revalidatePath("/");
}

export async function setLeave(employeeId: string, onLeave: boolean) {
  const record = await getOrCreateTodayAttendance(employeeId);
  await prisma.attendance.update({
    where: { id: record.id },
    data: { status: onLeave ? "LEAVE" : "PRESENT", clockIn: onLeave ? null : record.clockIn, clockOut: onLeave ? null : record.clockOut },
  });
  revalidatePath("/attendance");
  revalidatePath("/");
}

export async function updateProjectStage(projectId: string, stage: string) {
  await prisma.project.update({
    where: { id: projectId },
    data: { stage: stage as never },
  });
  revalidatePath("/projects");
  revalidatePath("/");
}

export async function updateProjectProgress(projectId: string, progress: number) {
  await prisma.project.update({
    where: { id: projectId },
    data: { progress: Math.max(0, Math.min(100, progress)) },
  });
  revalidatePath("/projects");
  revalidatePath("/");
}
