"use client";

import { useTransition } from "react";
import { updateEmployeeRole, setEmployeeActive } from "@/app/actions";

const ROLES = ["OWNER", "MANAGER", "DEVELOPER"];

export function EmployeeControls({ employeeId, role, active }: { employeeId: string; role: string; active: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <select
        className="text-xs border border-[var(--border)] rounded-md px-2 py-1 bg-[var(--surface)] text-[var(--foreground)] disabled:opacity-50"
        value={role}
        disabled={isPending}
        onChange={(e) => startTransition(() => updateEmployeeRole(employeeId, e.target.value))}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <button
        disabled={isPending}
        onClick={() => startTransition(() => setEmployeeActive(employeeId, !active))}
        className="text-xs font-medium px-2.5 py-1 rounded-md border border-[var(--border)] disabled:opacity-50"
      >
        {active ? "Deactivate" : "Reactivate"}
      </button>
    </div>
  );
}
