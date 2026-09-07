"use client";

import { useTransition } from "react";
import { clockIn, clockOut, setWorkMode, setLeave } from "@/app/actions";
import { Avatar, AttendanceBadge, fmtTime, fmtHours } from "@/lib/ui";

type Row = {
  employeeId: string;
  name: string;
  title: string | null;
  avatarColor: string;
  status: string;
  workMode: string;
  clockIn: Date | null;
  clockOut: Date | null;
};

export function AttendanceRow({ row }: { row: Row }) {
  const [isPending, startTransition] = useTransition();
  const hoursMs =
    row.clockIn && row.clockOut ? new Date(row.clockOut).getTime() - new Date(row.clockIn).getTime() : null;

  return (
    <tr className="border-t border-[var(--border)]">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          <Avatar name={row.name} color={row.avatarColor} />
          <div>
            <div className="text-sm font-medium">{row.name}</div>
            <div className="text-xs text-[var(--muted)]">{row.title}</div>
          </div>
        </div>
      </td>
      <td className="py-3 pr-4">
        <AttendanceBadge status={row.status} />
      </td>
      <td className="py-3 pr-4">
        {row.status === "PRESENT" ? (
          <select
            className="text-xs border border-[var(--border)] rounded-md px-2 py-1 bg-[var(--surface)] text-[var(--foreground)] disabled:opacity-50"
            value={row.workMode}
            disabled={isPending}
            onChange={(e) =>
              startTransition(() => setWorkMode(row.employeeId, e.target.value as "OFFICE" | "WFH"))
            }
          >
            <option value="OFFICE">Office</option>
            <option value="WFH">WFH</option>
          </select>
        ) : (
          <span className="text-xs text-[var(--muted)]">—</span>
        )}
      </td>
      <td className="py-3 pr-4 text-sm text-[var(--foreground)]">{fmtTime(row.clockIn)}</td>
      <td className="py-3 pr-4 text-sm text-[var(--foreground)]">{fmtTime(row.clockOut)}</td>
      <td className="py-3 pr-4 text-sm text-[var(--foreground)]">{hoursMs !== null ? fmtHours(hoursMs) : "—"}</td>
      <td className="py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {row.status === "PRESENT" && !row.clockIn && (
            <button
              disabled={isPending}
              onClick={() => startTransition(() => clockIn(row.employeeId))}
              className="text-xs font-medium px-2.5 py-1 rounded-md bg-[var(--accent)] text-black disabled:opacity-50"
            >
              Clock in
            </button>
          )}
          {row.status === "PRESENT" && row.clockIn && !row.clockOut && (
            <button
              disabled={isPending}
              onClick={() => startTransition(() => clockOut(row.employeeId))}
              className="text-xs font-medium px-2.5 py-1 rounded-md border border-[var(--foreground)] text-[var(--foreground)] disabled:opacity-50"
            >
              Clock out
            </button>
          )}
          <button
            disabled={isPending}
            onClick={() => startTransition(() => setLeave(row.employeeId, row.status !== "LEAVE"))}
            className="text-xs font-medium px-2.5 py-1 rounded-md border border-[var(--border)] disabled:opacity-50"
          >
            {row.status === "LEAVE" ? "Mark present" : "Mark leave"}
          </button>
        </div>
      </td>
    </tr>
  );
}
