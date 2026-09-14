"use client";

import { useState, useTransition } from "react";
import { createProposal } from "./sales-actions";

export function ProposalForm({ companies }: { companies: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const companyId = String(form.get("companyId") ?? "");
    const amount = Number(form.get("amount") ?? 0);
    if (!companyId || !amount) return;

    startTransition(async () => {
      try {
        await createProposal({
          companyId,
          contactPerson: String(form.get("contactPerson") ?? "") || undefined,
          items: String(form.get("items") ?? "") || undefined,
          amount,
          discount: form.get("discount") ? Number(form.get("discount")) : undefined,
          validUntil: String(form.get("validUntil") ?? "") || undefined,
          notes: String(form.get("notes") ?? "") || undefined,
        });
        (e.target as HTMLFormElement).reset();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create proposal");
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black">
        + New proposal
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[var(--border)] rounded-xl bg-[var(--surface)] p-5 mb-4 grid sm:grid-cols-2 gap-3">
      <select name="companyId" required className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
        <option value="">Select company…</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input name="contactPerson" placeholder="Contact person" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
      <input name="items" placeholder="Items / services" className="sm:col-span-2 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
      <input name="amount" type="number" min={0} required placeholder="Amount (₹)" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
      <input name="discount" type="number" min={0} placeholder="Discount (₹)" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
      <input name="validUntil" type="date" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
      <input name="notes" placeholder="Notes" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />

      {error && <p className="sm:col-span-2 text-xs text-red-400">{error}</p>}

      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={isPending} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50">
          {isPending ? "Creating…" : "Create proposal"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--muted)]">
          Cancel
        </button>
      </div>
    </form>
  );
}
