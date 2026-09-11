"use client";

import { useTransition } from "react";
import { markNotificationRead } from "@/app/actions";

export function NotificationRow({
  id,
  message,
  read,
  createdAt,
}: {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className={`flex items-start justify-between gap-3 px-4 py-3 border-b border-[var(--border)] last:border-none ${!read ? "bg-white/5" : ""}`}
    >
      <div className="flex items-start gap-2">
        {!read && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)] shrink-0" />}
        <div>
          <div className="text-sm">{message}</div>
          <div className="text-xs text-[var(--muted)] mt-0.5">{createdAt}</div>
        </div>
      </div>
      {!read && (
        <button
          disabled={isPending}
          onClick={() => startTransition(() => markNotificationRead(id))}
          className="text-xs text-[var(--accent)] hover:underline shrink-0 disabled:opacity-50"
        >
          Mark read
        </button>
      )}
    </div>
  );
}
