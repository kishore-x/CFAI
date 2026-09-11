"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateConversation } from "./chat-actions";
import { Avatar } from "@/lib/ui";

export function StartChatButton({ employeeId, name, title }: { employeeId: string; name: string; title: string | null }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const id = await getOrCreateConversation(employeeId);
          router.push(`/messages/${id}`);
        })
      }
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 disabled:opacity-50 transition-colors"
    >
      <Avatar name={name} />
      <div>
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-[var(--muted)]">{title}</div>
      </div>
    </button>
  );
}
