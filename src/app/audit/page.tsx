export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/lib/ui";
import { requireUser, isOwner } from "@/lib/authorize";

const ACTION_LABEL: Record<string, string> = {
  EMPLOYEE_CREATED: "created employee",
  EMPLOYEE_ROLE_CHANGED: "changed role for",
  EMPLOYEE_DEACTIVATED: "deactivated",
  EMPLOYEE_REACTIVATED: "reactivated",
  PROJECT_CREATED: "created project",
  PROJECT_STATUS_CHANGED: "changed status of",
  PROJECT_MEMBER_ADDED: "added a member to",
  PROJECT_MEMBER_REMOVED: "removed a member from",
  TASK_CREATED: "created a task in",
  TASK_ASSIGNED: "reassigned a task in",
  TASK_STATUS_CHANGED: "updated a task in",
  ATTENDANCE_CHECK_IN: "checked in",
  ATTENDANCE_CHECK_OUT: "checked out",
  ATTENDANCE_WORK_MODE: "updated work mode",
  LEAVE_REQUESTED: "requested leave",
  LEAVE_APPROVED: "approved leave for",
  LEAVE_REJECTED: "rejected leave for",
};

export default async function AuditLogPage() {
  const user = await requireUser();
  // Audit log is system administration, not just company-wide operations --
  // Owner-only per the business rule that draws the OWNER/PM line there.
  if (!isOwner(user)) notFound();

  const entries = await prisma.activityLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Last {entries.length} events</p>
      </div>

      <Card className="p-5">
        <ul className="space-y-2 text-sm">
          {entries.map((a) => (
            <li key={a.id} className="flex items-center justify-between text-[var(--muted)] border-b border-[var(--border)] pb-2 last:border-none">
              <span>
                <span className="text-[var(--foreground)]">{a.actor.name}</span> {ACTION_LABEL[a.action] ?? a.action.toLowerCase().replace(/_/g, " ")}
                <span className="text-xs ml-2 opacity-60">{a.entityType}</span>
              </span>
              <span className="text-xs">{new Date(a.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </li>
          ))}
          {entries.length === 0 && <li className="text-[var(--muted)]">No activity yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
