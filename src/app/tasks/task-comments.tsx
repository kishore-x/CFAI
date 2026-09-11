"use client";

import { useState, useTransition } from "react";
import { addTaskComment } from "./task-actions";
import { Avatar } from "@/lib/ui";

type Comment = { id: string; content: string; createdAt: string; authorName: string };

export function TaskComments({ taskId, comments }: { taskId: string; comments: Comment[] }) {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    startTransition(async () => {
      await addTaskComment(taskId, text);
      setContent("");
    });
  }

  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="flex items-start gap-2">
          <Avatar name={c.authorName} />
          <div>
            <div className="text-sm">
              <span className="font-medium">{c.authorName}</span>{" "}
              <span className="text-xs text-[var(--muted)]">{c.createdAt}</span>
            </div>
            <div className="text-sm text-[var(--muted)]">{c.content}</div>
          </div>
        </div>
      ))}
      {comments.length === 0 && <div className="text-sm text-[var(--muted)]">No comments yet.</div>}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60"
        />
        <button
          type="submit"
          disabled={isPending || !content.trim()}
          className="text-xs font-medium px-3 py-2 rounded-md bg-[var(--accent)] text-black disabled:opacity-50"
        >
          Post
        </button>
      </form>
    </div>
  );
}
