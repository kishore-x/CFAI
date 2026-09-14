"use client";

import { useState, useTransition } from "react";
import { completeMeeting } from "../sales-actions";

export type MeetingItem = {
  id: string;
  scheduledAt: string;
  meetingType: string;
  location: string | null;
  notes: string | null;
  completedAt: string | null;
  outcome: string | null;
  label: string;
  repName: string;
};

export function MeetingCard({ item, showRep }: { item: MeetingItem; showRep: boolean }) {
  const [showComplete, setShowComplete] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    if (!outcome.trim()) return;
    startTransition(async () => {
      await completeMeeting(item.id, outcome, nextAction || undefined);
      setShowComplete(false);
    });
  }

  return (
    <div className="rounded-md border border-[var(--border)] p-3 text-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium">{item.label}</span>
        <span className="text-xs text-[var(--muted)]">{new Date(item.scheduledAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <div className="text-xs text-[var(--muted)]">
        {item.meetingType.replace("_", " ")}
        {item.location && ` · ${item.location}`}
        {showRep && ` · ${item.repName}`}
      </div>
      {item.completedAt ? (
        <div className="text-xs text-[var(--muted)]">Outcome: {item.outcome}{item.notes ? "" : ""}</div>
      ) : !showComplete ? (
        <button onClick={() => setShowComplete(true)} className="text-xs font-medium px-2.5 py-1 rounded-md border border-[var(--border)] hover:bg-[var(--overlay-10)]">
          Mark completed
        </button>
      ) : (
        <form onSubmit={handleComplete} className="space-y-2">
          <input value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Outcome…" required className="w-full text-xs rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 outline-none focus:border-[var(--border-60)]" />
          <input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Next action (optional)" className="w-full text-xs rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 outline-none focus:border-[var(--border-60)]" />
          <div className="flex items-center gap-2">
            <button type="submit" disabled={isPending} className="text-xs font-medium px-2.5 py-1 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] disabled:opacity-50">
              {isPending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setShowComplete(false)} className="text-xs text-[var(--muted)]">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
