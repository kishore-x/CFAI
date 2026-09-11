"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUser, assertCanManageProject } from "@/lib/authorize";

export async function createMilestone(input: {
  projectId: string;
  name: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
}) {
  const user = await requireUser();
  await assertCanManageProject(user, input.projectId);

  await prisma.milestone.create({
    data: {
      projectId: input.projectId,
      name: input.name,
      description: input.description,
      startDate: input.startDate ? new Date(input.startDate) : null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    },
  });
  revalidatePath(`/projects/${input.projectId}`);
}

export async function updateMilestone(milestoneId: string, input: { status?: string; progress?: number }) {
  const user = await requireUser();
  const milestone = await prisma.milestone.findUniqueOrThrow({ where: { id: milestoneId } });
  await assertCanManageProject(user, milestone.projectId);

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      ...(input.status ? { status: input.status as never } : {}),
      ...(input.progress !== undefined ? { progress: Math.max(0, Math.min(100, input.progress)) } : {}),
    },
  });
  revalidatePath(`/projects/${milestone.projectId}`);
}
