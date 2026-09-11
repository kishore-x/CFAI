import "server-only";
import { prisma } from "@/lib/db";

export async function notify(recipientId: string, type: string, message: string, entity?: { type: string; id: string }) {
  await prisma.notification.create({
    data: {
      recipientId,
      type,
      message,
      entityType: entity?.type,
      entityId: entity?.id,
    },
  });
}

export async function notifyMany(recipientIds: string[], type: string, message: string, entity?: { type: string; id: string }) {
  const unique = Array.from(new Set(recipientIds));
  if (unique.length === 0) return;
  await prisma.notification.createMany({
    data: unique.map((recipientId) => ({
      recipientId,
      type,
      message,
      entityType: entity?.type,
      entityId: entity?.id,
    })),
  });
}

/** Owners and the Project Manager — used for company-wide alerts (new leave request, task blocked, etc). */
export async function companyWideRecipientIds(excludeId?: string): Promise<string[]> {
  const users = await prisma.employee.findMany({
    where: { active: true, role: { in: ["OWNER", "MANAGER"] } },
    select: { id: true },
  });
  return users.map((u) => u.id).filter((id) => id !== excludeId);
}
