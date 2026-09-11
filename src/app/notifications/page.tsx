export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Card } from "@/lib/ui";
import { requireUser } from "@/lib/authorize";
import { NotificationRow } from "./notification-row";
import { MarkAllRead } from "./mark-all-read";

export default async function NotificationsPage() {
  const user = await requireUser();

  const notifications = await prisma.notification.findMany({
    where: { recipientId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{unreadCount} unread</p>
        </div>
        <MarkAllRead hasUnread={unreadCount > 0} />
      </div>

      <Card className="overflow-hidden">
        {notifications.map((n) => (
          <NotificationRow
            key={n.id}
            id={n.id}
            message={n.message}
            read={n.read}
            createdAt={new Date(n.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          />
        ))}
        {notifications.length === 0 && <div className="p-8 text-center text-sm text-[var(--muted)]">No notifications yet.</div>}
      </Card>
    </div>
  );
}
