export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Card, LeaveStatusBadge, Avatar } from "@/lib/ui";
import { requireUser, hasCompanyWideView } from "@/lib/authorize";
import { LeaveForm } from "./leave-form";
import { LeaveReviewRow } from "./leave-review-row";

export default async function LeavePage() {
  const user = await requireUser();
  const canReview = hasCompanyWideView(user);

  const leaves = await prisma.leaveRequest.findMany({
    where: canReview ? {} : { employeeId: user.id },
    include: { employee: true, reviewedBy: true },
    orderBy: { createdAt: "desc" },
  });

  const pending = leaves.filter((l) => l.status === "PENDING");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{canReview ? "Leave requests" : "My Leave"}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {canReview ? `${pending.length} pending review` : "Your leave requests"}
          </p>
        </div>
      </div>

      {!canReview && <LeaveForm />}

      <Card className="p-5 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
              {canReview && <th className="pb-2 font-medium">Employee</th>}
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">Dates</th>
              <th className="pb-2 font-medium">Reason</th>
              <th className="pb-2 font-medium">Status</th>
              {canReview && <th className="pb-2 font-medium text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {leaves.map((l) => (
              <tr key={l.id} className="border-t border-[var(--border)]">
                {canReview && (
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <Avatar name={l.employee.name} />
                      <span className="text-sm">{l.employee.name}</span>
                    </div>
                  </td>
                )}
                <td className="py-2.5 pr-4 text-sm">{l.type}</td>
                <td className="py-2.5 pr-4 text-sm text-[var(--muted)]">
                  {new Date(l.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  {" – "}
                  {new Date(l.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                </td>
                <td className="py-2.5 pr-4 text-sm text-[var(--muted)] max-w-[220px] truncate">{l.reason ?? "—"}</td>
                <td className="py-2.5 pr-4">
                  <LeaveStatusBadge status={l.status} />
                </td>
                {canReview && (
                  <td className="py-2.5 text-right">
                    {l.status === "PENDING" ? (
                      <LeaveReviewRow leaveId={l.id} />
                    ) : (
                      <span className="text-xs text-[var(--muted)]">{l.reviewedBy?.name ?? "—"}</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {leaves.length === 0 && (
              <tr>
                <td colSpan={canReview ? 6 : 4} className="py-6 text-center text-sm text-[var(--muted)]">
                  No leave requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
