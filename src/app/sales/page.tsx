export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, StatCard } from "@/lib/ui";
import { requireUser, isOwner } from "@/lib/authorize";
import { pipelineValue, revenueWon, dealsWon, dealsLost, conversionRate, fmtCurrency, currentMonthRange, achievementPercent } from "@/lib/sales-service";

// Company-wide sales overview — Owner only. Sales Reps have their own
// equivalent view at "/" (see page.tsx's SALES_REP branch); a rep who
// navigates here directly still only gets their own scope enforced by
// every /sales/* sub-page, but this specific cross-rep comparison view is
// reserved for the Owner.
export default async function SalesOverviewPage({ searchParams }: { searchParams: Promise<{ rep?: string }> }) {
  const user = await requireUser();
  if (!isOwner(user)) notFound();
  const { rep: repFilter } = await searchParams;

  const reps = await prisma.employee.findMany({ where: { role: "SALES_REP", active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const scopedRepIds = repFilter ? [repFilter] : reps.map((r) => r.id);

  const [leads, opportunities, meetings, proposals, followUpsOpen] = await Promise.all([
    prisma.lead.findMany({ where: { assignedToId: { in: scopedRepIds } }, select: { status: true, assignedToId: true } }),
    prisma.opportunity.findMany({ where: { assignedToId: { in: scopedRepIds } }, select: { stage: true, estimatedValue: true, assignedToId: true } }),
    prisma.meeting.count({ where: { assignedToId: { in: scopedRepIds } } }),
    prisma.proposal.count({ where: { assignedToId: { in: scopedRepIds } } }),
    prisma.followUp.count({ where: { assignedToId: { in: scopedRepIds }, completedAt: null } }),
  ]);

  const { year, month } = currentMonthRange();
  const targets = await prisma.salesTarget.findMany({ where: { employeeId: { in: scopedRepIds }, year, month } });
  const targetTotal = targets.reduce((s, t) => s + t.targetAmount, 0);
  const achieved = revenueWon(opportunities);

  const byRep = reps.map((r) => ({
    rep: r,
    leads: leads.filter((l) => l.assignedToId === r.id).length,
    pipeline: pipelineValue(opportunities.filter((o) => o.assignedToId === r.id)),
    revenue: revenueWon(opportunities.filter((o) => o.assignedToId === r.id)),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales Overview</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Company-wide sales performance</p>
        </div>
        <form className="flex items-center gap-2">
          <select name="rep" defaultValue={repFilter ?? ""} className="text-xs rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5">
            <option value="">All reps</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button type="submit" className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-[var(--border)] hover:bg-white/10">
            Apply
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total leads" value={leads.length} />
        <StatCard label="Pipeline value" value={fmtCurrency(pipelineValue(opportunities))} />
        <StatCard label="Won revenue" value={fmtCurrency(achieved)} />
        <StatCard label="Conversion rate" value={`${conversionRate(opportunities)}%`} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Deals won" value={dealsWon(opportunities)} />
        <StatCard label="Deals lost" value={dealsLost(opportunities)} />
        <StatCard label="Meetings" value={meetings} />
        <StatCard label="Proposals" value={proposals} />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Target vs achievement</h2>
          <span className="text-sm text-[var(--muted)]">{achievementPercent(achieved, targetTotal)}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, achievementPercent(achieved, targetTotal))}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
          <span>Target: {fmtCurrency(targetTotal)}</span>
          <span>Achieved: {fmtCurrency(achieved)}</span>
          <span>Open follow-ups: {followUpsOpen}</span>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">By sales rep</h2>
          <Link href="/sales/reports" className="text-sm text-[var(--accent)] font-medium hover:underline">
            Full report
          </Link>
        </div>
        <ul className="space-y-2 text-sm">
          {byRep.map((r) => (
            <li key={r.rep.id} className="flex items-center justify-between">
              <Link href={`/sales?rep=${r.rep.id}`} className="hover:underline">
                {r.rep.name}
              </Link>
              <span className="text-xs text-[var(--muted)]">
                {r.leads} leads · {fmtCurrency(r.pipeline)} pipeline · {fmtCurrency(r.revenue)} won
              </span>
            </li>
          ))}
          {byRep.length === 0 && <li className="text-[var(--muted)]">No sales reps yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
