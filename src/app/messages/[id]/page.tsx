export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, Avatar } from "@/lib/ui";
import { requireUser, canAccessConversation } from "@/lib/authorize";
import { MessageThread } from "../message-thread";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!(await canAccessConversation(user, id))) notFound();

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      participants: { include: { employee: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { sender: true } },
    },
  });
  if (!conversation) notFound();

  const other = conversation.participants.find((p) => p.employeeId !== user.id)?.employee;

  // Mark read directly (not via the server action, which calls revalidatePath --
  // invalid to invoke during a page's own render).
  await prisma.conversationParticipant.update({
    where: { conversationId_employeeId: { conversationId: id, employeeId: user.id } },
    data: { lastReadAt: new Date() },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {other && <Avatar name={other.name} />}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{other?.name ?? "Conversation"}</h1>
          <p className="text-xs text-[var(--muted)]">{other?.title}</p>
        </div>
      </div>

      <Card className="flex flex-col h-[60vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {conversation.messages.map((m) => {
            const mine = m.senderId === user.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-[var(--accent)] text-black" : "bg-white/10"}`}>
                  <div>{m.content}</div>
                  <div className={`text-[10px] mt-1 ${mine ? "text-black/60" : "text-[var(--muted)]"}`}>
                    {new Date(m.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
          {conversation.messages.length === 0 && (
            <div className="text-sm text-[var(--muted)] text-center py-8">No messages yet. Say hello!</div>
          )}
        </div>
        <MessageThread conversationId={id} />
      </Card>
    </div>
  );
}
