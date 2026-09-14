"use client";

import { useTransition } from "react";
import { updateProposalStatus } from "../sales-actions";

const STATUSES = ["DRAFT", "SENT", "VIEWED", "NEGOTIATION", "ACCEPTED", "REJECTED"];

export function ProposalStatusSelect({ proposalId, status }: { proposalId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => startTransition(() => updateProposalStatus(proposalId, e.target.value))}
      className="text-xs border border-[var(--border)] rounded-md px-2 py-1 bg-[var(--surface)] text-[var(--foreground)] disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
