"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLeadStatus, addLeadNote, convertLeadToOpportunity, markLeadLost } from "../sales-actions";

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "MEETING", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

export function LeadDetailControls({ leadId, status, canEdit }: { leadId: string; status: string; canEdit: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [showConvert, setShowConvert] = useState(false);
  const [oppName, setOppName] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) return null;

  function handleConvert() {
    startTransition(async () => {
      try {
        const opp = await convertLeadToOpportunity(leadId, oppName || undefined);
        setShowConvert(false);
        router.push(`/sales/pipeline?opportunity=${opp.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to convert lead");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={status}
        disabled={isPending}
        onChange={(e) => startTransition(() => updateLeadStatus(leadId, e.target.value))}
        className="text-xs border border-[var(--border)] rounded-md px-2 py-1.5 bg-[var(--surface)] text-[var(--foreground)] disabled:opacity-50"
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!note.trim()) return;
          startTransition(async () => {
            await addLeadNote(leadId, note);
            setNote("");
          });
        }}
        className="flex items-center gap-2"
      >
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note / log an interaction…"
          className="text-xs rounded-md border border-[var(--border)] bg-transparent px-2.5 py-1.5 outline-none focus:border-white/60 w-56"
        />
        <button type="submit" disabled={isPending || !note.trim()} className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-[var(--border)] hover:bg-white/10 disabled:opacity-50">
          Add
        </button>
      </form>

      {status !== "WON" && status !== "LOST" && !showConvert && (
        <button onClick={() => setShowConvert(true)} className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-[var(--accent)] text-black">
          Convert to opportunity
        </button>
      )}
      {showConvert && (
        <div className="flex items-center gap-2">
          <input
            value={oppName}
            onChange={(e) => setOppName(e.target.value)}
            placeholder="Opportunity name (optional)"
            className="text-xs rounded-md border border-[var(--border)] bg-transparent px-2.5 py-1.5 outline-none focus:border-white/60 w-48"
          />
          <button disabled={isPending} onClick={handleConvert} className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50">
            {isPending ? "Converting…" : "Confirm"}
          </button>
          <button onClick={() => setShowConvert(false)} className="text-xs text-[var(--muted)]">
            Cancel
          </button>
        </div>
      )}

      {status !== "WON" && status !== "LOST" && (
        <button
          disabled={isPending}
          onClick={() => startTransition(() => markLeadLost(leadId))}
          className="text-xs text-[var(--muted)] hover:text-red-400 disabled:opacity-50"
        >
          Mark lost
        </button>
      )}

      {error && <p className="text-xs text-red-400 w-full">{error}</p>}
    </div>
  );
}
