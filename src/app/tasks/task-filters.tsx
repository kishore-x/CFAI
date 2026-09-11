"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "COMPLETED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

type Option = { id: string; name: string };

export function TaskFilters({
  projects,
  employees,
  current,
}: {
  projects: Option[];
  employees: Option[];
  current: { project?: string; developer?: string; status?: string; priority?: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function set(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const selectClass = "text-xs border border-[var(--border)] rounded-md px-2 py-1.5 bg-[var(--surface)] text-[var(--foreground)]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className={selectClass} value={current.project ?? ""} onChange={(e) => set("project", e.target.value)}>
        <option value="">All projects</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select className={selectClass} value={current.developer ?? ""} onChange={(e) => set("developer", e.target.value)}>
        <option value="">All developers</option>
        <option value="unassigned">Unassigned</option>
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      <select className={selectClass} value={current.status ?? ""} onChange={(e) => set("status", e.target.value)}>
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace("_", " ")}
          </option>
        ))}
      </select>
      <select className={selectClass} value={current.priority ?? ""} onChange={(e) => set("priority", e.target.value)}>
        <option value="">All priorities</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      {(current.project || current.developer || current.status || current.priority) && (
        <button onClick={() => router.push(pathname)} className="text-xs text-[var(--accent)] hover:underline">
          Clear filters
        </button>
      )}
    </div>
  );
}
