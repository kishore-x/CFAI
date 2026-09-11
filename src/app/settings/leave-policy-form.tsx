"use client";

import { useState, useTransition } from "react";
import { upsertLeavePolicy, setLeavePolicyActive } from "./settings-actions";

type Policy = {
  id: string;
  name: string;
  period: string;
  monthlyAllowance: number | null;
  annualAllowance: number | null;
  carryForward: boolean;
  maxCarryForward: number | null;
  active: boolean;
};

export function LeavePolicyManager({ policies }: { policies: Policy[] }) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const period = String(form.get("period") ?? "ANNUAL") as "MONTHLY" | "ANNUAL";
    startTransition(async () => {
      await upsertLeavePolicy({
        name: String(form.get("name") ?? ""),
        period,
        monthlyAllowance: period === "MONTHLY" ? Number(form.get("allowance") ?? 0) : null,
        annualAllowance: period === "ANNUAL" ? Number(form.get("allowance") ?? 0) : null,
        carryForward: form.get("carryForward") === "on",
        maxCarryForward: form.get("maxCarryForward") ? Number(form.get("maxCarryForward")) : null,
      });
      (document.getElementById("leave-policy-form") as HTMLFormElement | null)?.reset();
      setShowForm(false);
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {policies.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2 text-sm">
            <div>
              <span className="font-medium">{p.name}</span>{" "}
              <span className="text-[var(--muted)]">
                — {p.period === "MONTHLY" ? `${p.monthlyAllowance}/month` : `${p.annualAllowance}/year`}
                {p.carryForward && `, carries forward up to ${p.maxCarryForward ?? "∞"}`}
              </span>
            </div>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => setLeavePolicyActive(p.id, !p.active))}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
            >
              {p.active ? "Disable" : "Enable"}
            </button>
          </div>
        ))}
      </div>

      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="text-xs text-[var(--accent)] hover:underline">
          + Add leave type
        </button>
      ) : (
        <form id="leave-policy-form" onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-2 bg-white/5 rounded-md p-3">
          <input name="name" required placeholder="Leave type name" className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm" />
          <select name="period" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm">
            <option value="ANNUAL">Annual</option>
            <option value="MONTHLY">Monthly</option>
          </select>
          <input name="allowance" type="number" min={0} required placeholder="Allowance (days)" className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm" />
          <input name="maxCarryForward" type="number" min={0} placeholder="Max carry forward (optional)" className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm" />
          <label className="flex items-center gap-2 text-xs text-[var(--muted)] sm:col-span-2">
            <input type="checkbox" name="carryForward" /> Allow carry forward
          </label>
          <div className="sm:col-span-2 flex items-center gap-2">
            <button type="submit" disabled={isPending} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50">
              Save
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-[var(--muted)]">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
