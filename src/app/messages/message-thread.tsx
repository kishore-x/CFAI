"use client";

import { useState, useTransition } from "react";
import { sendMessage } from "./chat-actions";

export function MessageThread({ conversationId }: { conversationId: string }) {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    startTransition(async () => {
      await sendMessage(conversationId, text);
      setContent("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-[var(--border)]">
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type a message…"
        className="flex-1 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60"
      />
      <button
        type="submit"
        disabled={isPending || !content.trim()}
        className="text-xs font-medium px-3 py-2 rounded-md bg-[var(--accent)] text-black disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}
