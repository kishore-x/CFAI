export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, Avatar } from "@/lib/ui";
import { requireUser, hasCompanyWideView } from "@/lib/authorize";
import { StartChatButton } from "./start-chat";

export default async function MessagesPage() {
  const user = await requireUser();
  const companyWide = hasCompanyWideView(user);

  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { employeeId: user.id } } },
    include: {
      participants: { include: { employee: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  // People the user can start a new chat with, excluding those already in a conversation.
  const existingOtherIds = new Set(
    conversations.flatMap((c) => c.participants.filter((p) => p.employeeId !== user.id).map((p) => p.employeeId))
  );
  const candidates = companyWide
    ? await prisma.employee.findMany({ where: { active: true, id: { not: user.id } }, orderBy: { name: "asc" } })
    : await prisma.employee.findMany({ where: { active: true, role: { in: ["OWNER", "MANAGER"] } }, orderBy: { name: "asc" } });
  const newContacts = candidates.filter((c) => !existingOtherIds.has(c.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-sm text-[var(--muted)] mt-1">{conversations.length} conversations</p>
      </div>

      <Card className="overflow-hidden">
        {conversations.map((c) => {
          const other = c.participants.find((p) => p.employeeId !== user.id)?.employee;
          const me = c.participants.find((p) => p.employeeId === user.id);
          const lastMessage = c.messages[0];
          const unread = lastMessage && lastMessage.senderId !== user.id && (!me?.lastReadAt || lastMessage.createdAt > me.lastReadAt);
          if (!other) return null;
          return (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-none hover:bg-white/5 transition-colors ${unread ? "bg-white/5" : ""}`}
            >
              <Avatar name={other.name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{other.name}</div>
                  {unread && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
                </div>
                <div className="text-xs text-[var(--muted)] truncate">{lastMessage?.content ?? "No messages yet"}</div>
              </div>
            </Link>
          );
        })}
        {conversations.length === 0 && <div className="p-6 text-sm text-[var(--muted)]">No conversations yet — start one below.</div>}
      </Card>

      {newContacts.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[var(--muted)] mb-2">Start a new conversation</h2>
          <Card className="overflow-hidden">
            {newContacts.map((c) => (
              <StartChatButton key={c.id} employeeId={c.id} name={c.name} title={c.title} />
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
