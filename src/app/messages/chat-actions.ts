"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUser, hasCompanyWideView, assertCanAccessConversation, ForbiddenError } from "@/lib/authorize";
import { notify } from "@/lib/notify";

/** Finds or creates a 1:1 conversation between the current user and another employee. */
export async function getOrCreateConversation(otherEmployeeId: string): Promise<string> {
  const user = await requireUser();
  if (otherEmployeeId === user.id) throw new Error("Cannot start a conversation with yourself");

  // A developer may only chat with company-wide users (PM/Owner); PM/Owner may chat with anyone.
  if (!hasCompanyWideView(user)) {
    const other = await prisma.employee.findUniqueOrThrow({ where: { id: otherEmployeeId } });
    if (other.role === "DEVELOPER") throw new ForbiddenError("Developers can only message the Project Manager or Owners");
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      participants: { some: { employeeId: user.id } },
      AND: { participants: { some: { employeeId: otherEmployeeId } } },
    },
    include: { participants: true },
  });
  // Only reuse conversations that are exactly these two participants (1:1).
  const exact = existing && existing.participants.length === 2 ? existing : null;
  if (exact) return exact.id;

  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ employeeId: user.id }, { employeeId: otherEmployeeId }],
      },
    },
  });
  return conversation.id;
}

export async function sendMessage(conversationId: string, content: string) {
  const user = await requireUser();
  await assertCanAccessConversation(user, conversationId);
  const trimmed = content.trim();
  if (!trimmed) return;

  const message = await prisma.message.create({
    data: { conversationId, senderId: user.id, content: trimmed },
  });
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  await prisma.conversationParticipant.update({
    where: { conversationId_employeeId: { conversationId, employeeId: user.id } },
    data: { lastReadAt: new Date() },
  });

  const others = await prisma.conversationParticipant.findMany({
    where: { conversationId, employeeId: { not: user.id } },
  });
  await Promise.all(
    others.map((p) => notify(p.employeeId, "NEW_MESSAGE", `New message from ${user.name ?? "a teammate"}`, { type: "Conversation", id: conversationId }))
  );

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return message;
}

export async function markConversationRead(conversationId: string) {
  const user = await requireUser();
  await assertCanAccessConversation(user, conversationId);
  await prisma.conversationParticipant.update({
    where: { conversationId_employeeId: { conversationId, employeeId: user.id } },
    data: { lastReadAt: new Date() },
  });
  revalidatePath("/messages");
}
