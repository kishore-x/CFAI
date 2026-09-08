"use client";

import { useState, useTransition } from "react";
import { createEmployee } from "@/app/actions";

export function AddEmployeeForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "");
    const title = String(form.get("title") ?? "");
    const department = String(form.get("department") ?? "");
    const role = String(form.get("role") ?? "DEVELOPER");

    startTransition(async () => {
      try {
        const { tempPassword } = await createEmployee({ name, email, title, department, role });
        setResult({ email, tempPassword });
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create employee");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black"
      >
        Add employee
      </button>
    );
  }

  return (
    <div className="border border-[var(--border)] rounded-xl bg-[var(--surface)] p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">Add employee</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]">
          Close
        </button>
      </div>

      {result ? (
        <div className="text-sm space-y-2">
          <div className="text-[var(--muted)]">Created. Share this temporary password once — they&apos;ll be forced to change it on first login.</div>
          <div className="rounded-md bg-white/5 px-3 py-2 font-mono text-xs">
            {result.email} / {result.tempPassword}
          </div>
          <button
            onClick={() => {
              setResult(null);
              setOpen(false);
            }}
            className="text-xs font-medium px-2.5 py-1 rounded-md border border-[var(--border)]"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3">
          <input name="name" required placeholder="Full name" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
          <input name="email" type="email" required placeholder="Email" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
          <input name="title" placeholder="Job title" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
          <input name="department" placeholder="Department" className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
          <select name="role" defaultValue="DEVELOPER" className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-white/60">
            <option value="OWNER">Owner</option>
            <option value="MANAGER">Project Manager</option>
            <option value="DEVELOPER">Developer</option>
          </select>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50"
            >
              {isPending ? "Creating…" : "Create"}
            </button>
            {error && <span className="text-xs text-red-400">{error}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
