"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function MonthSelector({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(nextYear: number, nextMonth: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(nextYear));
    params.set("month", String(nextMonth));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={`${year}-${month}`}
      onChange={(e) => {
        const [y, m] = e.target.value.split("-").map(Number);
        update(y, m);
      }}
      className="text-xs border border-[var(--border)] rounded-md px-2 py-1.5 bg-[var(--surface)] text-[var(--foreground)]"
    >
      {Array.from({ length: 6 }).map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        return (
          <option key={`${y}-${m}`} value={`${y}-${m}`}>
            {MONTHS[m - 1]} {y}
          </option>
        );
      })}
    </select>
  );
}
