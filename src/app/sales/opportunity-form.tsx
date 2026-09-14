"use client";

import { useState, useTransition } from "react";
import { createOpportunity } from "./sales-actions";

type CompanyOption = { id: string; name: string };

export function OpportunityForm({ companies }: { companies: CompanyOption[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const companyId = String(form.get("companyId") ?? "");
    if (!name || !companyId) return;

    startTransition(async () => {
      try {
        await createOpportunity({
          name,
          companyId,
          contactPerson: String(form.get("contactPerson") ?? "") || undefined,
          estimatedValue: form.get("estimatedValue") ? Number(form.get("estimatedValue")) : undefined,
          probability: form.get("probability") ? Number(form.get("probability")) : undefined,
          expectedCloseDate: String(form.get("expectedCloseDate") ?? "") || undefined,
          priority: String(form.get("priority") ?? "MEDIUM"),
        });
        (e.target as HTMLFormElement).reset();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create opportunity");
      }
    });
  }

  if (companies.length === 0) return null;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)]">
        + New opportunity
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[var(--border)] rounded-xl bg-[var(--surface)] p-5 mb-4 grid sm:grid-cols-2 gap-3">
      <input name="name" required placeholder="Opportunity name" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--border-60)]" />
      <select name="companyId" required className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
        <option value="">Select company…</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input name="contactPerson" placeholder="Contact person" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--border-60)]" />
      <input name="estimatedValue" type="number" min={0} placeholder="Estimated value (₹)" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--border-60)]" />
      <input name="probability" type="number" min={0} max={100} placeholder="Probability %" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--border-60)]" />
      <input name="expectedCloseDate" type="date" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
      <select name="priority" defaultValue="MEDIUM" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="URGENT">Urgent</option>
      </select>

      {error && <p className="sm:col-span-2 text-xs text-red-400">{error}</p>}

      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={isPending} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] disabled:opacity-50">
          {isPending ? "Creating…" : "Create opportunity"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--muted)]">
          Cancel
        </button>
      </div>
    </form>
  );
}
