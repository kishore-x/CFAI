"use client";

import { useState, useTransition } from "react";
import { createCompany } from "./sales-actions";

type Candidate = { id: string; name: string };

export function CompanyForm({ reps }: { reps: Candidate[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;

    startTransition(async () => {
      try {
        await createCompany({
          name,
          contactPerson: String(form.get("contactPerson") ?? "") || undefined,
          designation: String(form.get("designation") ?? "") || undefined,
          email: String(form.get("email") ?? "") || undefined,
          phone: String(form.get("phone") ?? "") || undefined,
          website: String(form.get("website") ?? "") || undefined,
          industry: String(form.get("industry") ?? "") || undefined,
          location: String(form.get("location") ?? "") || undefined,
          leadSource: String(form.get("leadSource") ?? "") || undefined,
          estimatedValue: form.get("estimatedValue") ? Number(form.get("estimatedValue")) : undefined,
          notes: String(form.get("notes") ?? "") || undefined,
          assignedToId: String(form.get("assignedToId") ?? "") || undefined,
        });
        (e.target as HTMLFormElement).reset();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create company");
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)]">
        + New company
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[var(--border)] rounded-xl bg-[var(--surface)] p-5 mb-4 grid sm:grid-cols-2 gap-3">
      <input name="name" required placeholder="Company name" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--border-60)]" />
      <input name="contactPerson" placeholder="Contact person" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--border-60)]" />
      <input name="designation" placeholder="Designation" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--border-60)]" />
      <input name="email" type="email" placeholder="Email" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--border-60)]" />
      <input name="phone" placeholder="Phone" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--border-60)]" />
      <input name="website" placeholder="Website" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--border-60)]" />
      <input name="industry" placeholder="Industry" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--border-60)]" />
      <input name="location" placeholder="Location" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--border-60)]" />
      <input name="leadSource" placeholder="Lead source" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--border-60)]" />
      <input name="estimatedValue" type="number" min={0} placeholder="Estimated deal value (₹)" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--border-60)]" />
      {reps.length > 0 && (
        <select name="assignedToId" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
          <option value="">Assign to me</option>
          {reps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      )}
      <input name="notes" placeholder="Notes" className="sm:col-span-2 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--border-60)]" />

      {error && <p className="sm:col-span-2 text-xs text-red-400">{error}</p>}

      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={isPending} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] disabled:opacity-50">
          {isPending ? "Creating…" : "Create company"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--muted)]">
          Cancel
        </button>
      </div>
    </form>
  );
}
