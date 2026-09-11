"use client";

import { useTransition } from "react";
import { markAllNotificationsRead } from "@/app/actions";

export function MarkAllRead({ hasUnread }: { hasUnread: boolean }) {
  const [isPending, startTransition] = useTransition();
  if (!hasUnread) return null;

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => markAllNotificationsRead())}
      className="text-xs font-medium px-3 py-1.5 rounded-md border border-[var(--border)] disabled:opacity-50"
    >
      Mark all read
    </button>
  );
}
