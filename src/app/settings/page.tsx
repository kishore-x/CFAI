export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/lib/ui";
import { requireUser, isOwner } from "@/lib/authorize";
import { LeavePolicyManager } from "./leave-policy-form";
import { AttendanceConfigForm } from "./attendance-config-form";

export default async function SettingsPage() {
  const user = await requireUser();
  if (!isOwner(user)) notFound();

  const [policies, config] = await Promise.all([
    prisma.leavePolicy.findMany({ orderBy: { name: "asc" } }),
    prisma.attendanceConfig.findUnique({ where: { id: "singleton" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Company-wide policy configuration</p>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Leave policies</h2>
        <LeavePolicyManager policies={policies} />
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Attendance rules</h2>
        <p className="text-xs text-[var(--muted)] mb-3">Check-ins after the grace period are flagged as late in attendance issues.</p>
        <AttendanceConfigForm officeStartTime={config?.officeStartTime ?? "09:30"} graceMinutes={config?.graceMinutes ?? 15} />
      </Card>
    </div>
  );
}
