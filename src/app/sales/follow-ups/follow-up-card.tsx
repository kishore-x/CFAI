"use client";

import { useState, useTransition } from "react";
import { completeFollowUp } from "../sales-actions";

export type FollowUpItem = {
  id: string;
  type: string;
  dueAt: string;
  notes: string | null;
  completedAt: string | null;
  outcome: string | null;
  label: string;
  repName: string;
};

export function FollowUpCard({ item, showRep, canEdit }: { item: FollowUpItem; showRep: boolean; canEdit: boolean }) {
  const [showComplete, setShowComplete] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    if (!outcome.trim()) return;
    startTransition(async () => {
      await completeFollowUp(item.id, outcome, nextDate ? { dueAt: nextDate, type: item.type } : undefined);
      setShowComplete(false);
    });
  }

  return (
    <div className="rounded-md border border-[var(--border)] p-3 text-sm space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{item.label}</span>
          <span className="text-xs text-[var(--muted)] ml-2">{item.type}</span>
        </div>
        <span className="text-xs text-[var(--muted)]">{new Date(item.dueAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      {showRep && <div className="text-xs text-[var(--muted)]">{item.repName}</div>}
      {item.notes && <div className="text-xs text-[var(--muted)]">{item.notes}</div>}

      {item.completedAt ? (
        <div className="text-xs text-[var(--muted)]">Outcome: {item.outcome}</div>
      ) : (
        canEdit && (
          <>
            {!showComplete ? (
              <button onClick={() => setShowComplete(true)} className="text-xs font-medium px-2.5 py-1 rounded-md border border-[var(--border)] hover:bg-white/10">
                Mark completed
              </button>
            ) : (
              <form onSubmit={handleComplete} className="space-y-2">
                <input
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="Outcome…"
                  required
                  className="w-full text-xs rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 outline-none focus:border-white/60"
                />
                <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  Next follow-up (optional)
                  <input type="datetime-local" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs" />
                </label>
                <div className="flex items-center gap-2">
                  <button type="submit" disabled={isPending} className="text-xs font-medium px-2.5 py-1 rounded-md bg-[var(--accent)] text-black disabled:opacity-50">
                    {isPending ? "Saving…" : "Save"}
                  </button>
                  <button type="button" onClick={() => setShowComplete(false)} className="text-xs text-[var(--muted)]">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )
      )}
    </div>
  );
}
