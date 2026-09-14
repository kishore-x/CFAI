"use client";

import { useTransition } from "react";
import { updateOpportunityStage } from "../sales-actions";
import { TaskPriorityLabel } from "@/lib/ui";

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "MEETING", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

export type OpportunityCard = {
  id: string;
  name: string;
  companyName: string;
  contactPerson: string | null;
  estimatedValue: number;
  stage: string;
  priority: string;
  expectedCloseDate: string | null;
  nextFollowUpAt: string | null;
  repName: string;
};

export function PipelineBoard({ opportunities, showRep }: { opportunities: OpportunityCard[]; showRep: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="overflow-x-auto scrollbar-hide -mx-1">
      <div className="flex gap-3 px-1 min-w-max">
        {STAGES.map((stage) => {
          const cards = opportunities.filter((o) => o.stage === stage);
          const total = cards.reduce((s, o) => s + o.estimatedValue, 0);
          return (
            <div key={stage} className="w-64 shrink-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{stage}</span>
                <span className="text-xs text-[var(--muted)]">₹{Math.round(total).toLocaleString("en-IN")}</span>
              </div>
              <div className="space-y-2">
                {cards.map((o) => (
                  <div key={o.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs space-y-1.5">
                    <div className="font-medium text-sm">{o.name}</div>
                    <div className="text-[var(--muted)]">{o.companyName}</div>
                    {o.contactPerson && <div className="text-[var(--muted)]">{o.contactPerson}</div>}
                    <div className="flex items-center justify-between">
                      <span>₹{Math.round(o.estimatedValue).toLocaleString("en-IN")}</span>
                      <TaskPriorityLabel priority={o.priority} />
                    </div>
                    {o.expectedCloseDate && <div className="text-[var(--muted)]">Close: {new Date(o.expectedCloseDate).toLocaleDateString("en-GB")}</div>}
                    {showRep && <div className="text-[var(--muted)]">{o.repName}</div>}
                    <select
                      value={o.stage}
                      disabled={isPending}
                      onChange={(e) => startTransition(() => updateOpportunityStage(o.id, e.target.value))}
                      className="mt-1 w-full text-xs border border-[var(--border)] rounded-md px-1.5 py-1 bg-[var(--background)] disabled:opacity-50"
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          Move to {s}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                {cards.length === 0 && <div className="text-xs text-[var(--muted)] px-1">—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
