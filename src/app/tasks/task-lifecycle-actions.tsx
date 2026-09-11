"use client";

import { useState, useTransition } from "react";
import { reviewTask, acceptTask, requestClarification, submitTaskForReview } from "./task-actions";

export function TaskLifecycleActions({
  taskId,
  isAssignee,
  reviewedAt,
  acceptedAt,
  status,
}: {
  taskId: string;
  isAssignee: boolean;
  reviewedAt: string | null;
  acceptedAt: string | null;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showClarify, setShowClarify] = useState(false);
  const [message, setMessage] = useState("");

  if (!isAssignee) return null;

  if (!reviewedAt) {
    return (
      <button
        disabled={isPending}
        onClick={() => startTransition(() => reviewTask(taskId))}
        className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50"
      >
        Review task
      </button>
    );
  }

  if (!acceptedAt) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <button
          disabled={isPending}
          onClick={() => startTransition(() => acceptTask(taskId))}
          className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50"
        >
          Accept task
        </button>
        {!showClarify ? (
          <button onClick={() => setShowClarify(true)} className="text-xs font-medium px-3 py-1.5 rounded-md border border-[var(--border)]">
            Request clarification
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What do you need clarified?"
              className="text-xs rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 outline-none focus:border-white/60"
            />
            <button
              disabled={isPending || !message.trim()}
              onClick={() =>
                startTransition(async () => {
                  await requestClarification(taskId, message);
                  setMessage("");
                  setShowClarify(false);
                })
              }
              className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-[var(--border)] disabled:opacity-50"
            >
              Send
            </button>
          </div>
        )}
      </div>
    );
  }

  if (status !== "COMPLETED" && status !== "IN_REVIEW") {
    return (
      <button
        disabled={isPending}
        onClick={() => startTransition(() => submitTaskForReview(taskId))}
        className="text-xs font-medium px-3 py-1.5 rounded-md border border-[var(--border)] disabled:opacity-50"
      >
        Submit for review
      </button>
    );
  }

  return null;
}
