"use client";

import { useTransition } from "react";
import { reviewLeaveRequest } from "@/app/actions";

export function LeaveReviewRow({ leaveId }: { leaveId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={isPending}
        onClick={() => startTransition(() => reviewLeaveRequest(leaveId, "APPROVED"))}
        className="text-xs font-medium px-2.5 py-1 rounded-md bg-[var(--accent)] text-black disabled:opacity-50"
      >
        Approve
      </button>
      <button
        disabled={isPending}
        onClick={() => startTransition(() => reviewLeaveRequest(leaveId, "REJECTED"))}
        className="text-xs font-medium px-2.5 py-1 rounded-md border border-[var(--border)] disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}
