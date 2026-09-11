"use client";

import { useMemo, useState, useTransition } from "react";
import { submitLeaveRequest } from "@/app/actions";

type Balance = { name: string; remaining: number; allowance: number };

function daysBetween(start: string, end: string) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 0;
  return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
}

export function LeaveForm({ balances }: { balances: Balance[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(balances[0]?.name ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const selected = balances.find((b) => b.name === type);
  const requested = useMemo(() => daysBetween(startDate, endDate), [startDate, endDate]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const reason = String(form.get("reason") ?? "") || undefined;
    if (!startDate || !endDate) return;

    startTransition(async () => {
      try {
        await submitLeaveRequest({ type, startDate, endDate, reason });
        setStartDate("");
        setEndDate("");
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit");
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black">
        Request leave
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[var(--border)] rounded-xl bg-[var(--surface)] p-5 mb-4 grid sm:grid-cols-2 gap-3">
      <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
        {balances.map((b) => (
          <option key={b.name} value={b.name}>
            {b.name}
          </option>
        ))}
      </select>
      <div className="text-xs text-[var(--muted)] flex items-center">
        Available: {selected?.remaining ?? 0} of {selected?.allowance ?? 0} days
      </div>
      <label className="text-xs text-[var(--muted)]">
        Start date
        <input
          type="date"
          required
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
      </label>
      <label className="text-xs text-[var(--muted)]">
        End date
        <input
          type="date"
          required
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
      </label>
      {requested > 0 && selected && (
        <div className="sm:col-span-2 text-xs text-[var(--muted)]">
          Requested: {requested} day{requested > 1 ? "s" : ""} · Remaining after approval:{" "}
          <span className={requested > selected.remaining ? "text-red-400" : ""}>{Math.max(selected.remaining - requested, 0)}</span>
          {requested > selected.remaining && " — exceeds available balance, PM approval still required"}
        </div>
      )}
      <input name="reason" placeholder="Reason (optional)" className="sm:col-span-2 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60" />
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={isPending} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50">
          {isPending ? "Submitting…" : "Submit request"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--muted)]">
          Cancel
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </form>
  );
}
