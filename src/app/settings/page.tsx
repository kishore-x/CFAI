export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Card } from "@/lib/ui";
import { requireUser, isOwner } from "@/lib/authorize";
import { LeavePolicyManager } from "./leave-policy-form";
import { AttendanceConfigForm } from "./attendance-config-form";
import { NotificationPreferencesForm, type NotificationPrefs } from "./notification-prefs-form";

const DEFAULT_PREFS: NotificationPrefs = {
  emailEnabled: true,
  taskAssigned: true,
  taskCompleted: true,
  taskBlocked: true,
  clarificationRequested: true,
  leaveRequested: true,
  leaveApproved: true,
  leaveRejected: true,
  newMessage: true,
  dailyWorkUpdate: true,
  deadlineReminder: true,
};

export default async function SettingsPage() {
  const user = await requireUser();
  const owner = isOwner(user);

  const [policies, config, myPrefs] = await Promise.all([
    owner ? prisma.leavePolicy.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    owner ? prisma.attendanceConfig.findUnique({ where: { id: "singleton" } }) : Promise.resolve(null),
    prisma.notificationPreference.findUnique({ where: { employeeId: user.id } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-[var(--muted)] mt-1">{owner ? "Company-wide policy configuration" : "Your account preferences"}</p>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Notifications</h2>
        <NotificationPreferencesForm initial={myPrefs ?? DEFAULT_PREFS} />
      </Card>

      {owner && (
        <>
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Leave policies</h2>
            <LeavePolicyManager policies={policies} />
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold mb-3">Attendance rules</h2>
            <p className="text-xs text-[var(--muted)] mb-3">Check-ins after the grace period are flagged as late in attendance issues.</p>
            <AttendanceConfigForm officeStartTime={config?.officeStartTime ?? "09:30"} graceMinutes={config?.graceMinutes ?? 15} />
          </Card>
        </>
      )}
    </div>
  );
}
