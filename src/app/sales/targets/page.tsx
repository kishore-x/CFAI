export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/lib/ui";
import { requireUser, isOwner, canAccessSalesCRM } from "@/lib/authorize";
import { currentMonthRange, achievementPercent, revenueWon, pipelineValue, fmtCurrency } from "@/lib/sales-service";
import { TargetForm } from "../target-form";

export default async function TargetsPage() {
  const user = await requireUser();
  if (!canAccessSalesCRM(user)) notFound();
  const owner = isOwner(user);
  const { year, month, start, end } = currentMonthRange();
  const monthLabel = start.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

  const reps = owner
    ? await prisma.employee.findMany({ where: { role: "SALES_REP", active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [{ id: user.id, name: user.name ?? "Me" }];

  const rows = await Promise.all(
    reps.map(async (rep) => {
      const [target, opportunities] = await Promise.all([
        prisma.salesTarget.findUnique({ where: { employeeId_year_month: { employeeId: rep.id, year, month } } }),
        prisma.opportunity.findMany({
          where: { assignedToId: rep.id, OR: [{ stage: "WON", updatedAt: { gte: start, lt: end } }, { stage: { notIn: ["WON", "LOST"] } }] },
          select: { stage: true, estimatedValue: true },
        }),
      ]);
      const achieved = revenueWon(opportunities);
      const targetAmount = target?.targetAmount ?? 0;
      return {
        rep,
        targetAmount,
        achieved,
        remaining: Math.max(0, targetAmount - achieved),
        achievementPct: achievementPercent(achieved, targetAmount),
        pipeline: pipelineValue(opportunities),
      };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Targets</h1>
        <p className="text-sm text-[var(--muted)] mt-1">{monthLabel}</p>
      </div>

      {owner && (
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Set monthly target</h2>
          <TargetForm reps={reps} year={year} month={month} />
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {rows.map((r) => (
          <Card key={r.rep.id} className="p-5">
            {owner && <h2 className="font-semibold mb-3">{r.rep.name}</h2>}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-[var(--muted)]">Target</div>
                <div className="text-lg font-semibold">{fmtCurrency(r.targetAmount)}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Achieved</div>
                <div className="text-lg font-semibold">{fmtCurrency(r.achieved)}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Remaining</div>
                <div className="text-lg font-semibold">{fmtCurrency(r.remaining)}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Pipeline</div>
                <div className="text-lg font-semibold">{fmtCurrency(r.pipeline)}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--muted)]">Achievement</span>
                <span className="text-xs text-[var(--muted)]">{r.achievementPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, r.achievementPct)}%` }} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
