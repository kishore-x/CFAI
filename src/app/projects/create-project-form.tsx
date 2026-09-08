"use client";

import { useState, useTransition } from "react";
import { createProject } from "@/app/actions";

type Candidate = { id: string; name: string };

export function CreateProjectForm({ managers }: { managers: Candidate[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    const client = String(form.get("client") ?? "") || undefined;
    const description = String(form.get("description") ?? "") || undefined;
    const deadline = String(form.get("deadline") ?? "") || undefined;
    const managerId = String(form.get("managerId") ?? "") || undefined;

    startTransition(async () => {
      await createProject({ name, client, description, deadline, managerId });
      (e.target as HTMLFormElement).reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black">
        New project
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[var(--border)] rounded-xl bg-[var(--surface)] p-5 mb-4 grid sm:grid-cols-2 gap-3">
      <input name="name" required placeholder="Project name" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
      <input name="client" placeholder="Client" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
      <input name="description" placeholder="Description" className="sm:col-span-2 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
      <input name="deadline" type="date" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
      {managers.length > 0 && (
        <select name="managerId" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
          <option value="">No manager assigned</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      )}
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={isPending} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50">
          {isPending ? "Creating…" : "Create project"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--muted)]">
          Cancel
        </button>
      </div>
    </form>
  );
}
