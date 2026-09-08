"use client";

import { useState, useTransition } from "react";
import { addProjectMember, removeProjectMember } from "@/app/actions";
import { Avatar } from "@/lib/ui";

const ROLES = ["LEAD", "DEVELOPER", "DESIGNER", "QA", "CONTRIBUTOR"];

type Member = { id: string; name: string; role: string };
type Candidate = { id: string; name: string };

export function MemberList({
  projectId,
  members,
  candidates,
  canManage,
}: {
  projectId: string;
  members: Member[];
  candidates: Candidate[];
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  const memberIds = new Set(members.map((m) => m.id));
  const available = candidates.filter((c) => !memberIds.has(c.id));

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const employeeId = String(form.get("employeeId") ?? "");
    const role = String(form.get("role") ?? "CONTRIBUTOR");
    if (!employeeId) return;
    startTransition(async () => {
      await addProjectMember(projectId, employeeId, role);
      setShowForm(false);
    });
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      {members.map((m) => (
        <div key={m.id} className="flex items-center gap-2 rounded-md bg-white/5 pl-1.5 pr-2 py-1.5">
          <Avatar name={m.name} />
          <div className="text-xs">
            <div className="font-medium">{m.name}</div>
            <div className="text-[var(--muted)]">{m.role}</div>
          </div>
          {canManage && (
            <button
              disabled={isPending}
              onClick={() => startTransition(() => removeProjectMember(projectId, m.id))}
              className="ml-1 text-[var(--muted)] hover:text-red-400 text-xs disabled:opacity-50"
              title="Remove from project"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {canManage && !showForm && (
        <button onClick={() => setShowForm(true)} className="text-xs text-[var(--accent)] hover:underline">
          + Add member
        </button>
      )}

      {canManage && showForm && (
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <select name="employeeId" required className="text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
            <option value="">Select person…</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="role" defaultValue="CONTRIBUTOR" className="text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button type="submit" disabled={isPending} className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50">
            Add
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="text-xs text-[var(--muted)]">
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
