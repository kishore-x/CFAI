export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/lib/ui";
import { requireUser, isOwner, canAccessSalesCRM } from "@/lib/authorize";
import { conversionRate, pipelineValue, revenueWon, dealsWon, dealsLost, fmtCurrency } from "@/lib/sales-service";

async function repReport(employeeId: string, range?: { start: Date; end: Date }) {
  const dateFilter = range ? { createdAt: { gte: range.start, lt: range.end } } : {};

  const [leads, opportunities, meetings, proposals, followUps] = await Promise.all([
    prisma.lead.findMany({ where: { assignedToId: employeeId, ...dateFilter }, select: { status: true, lastContactedAt: true } }),
    prisma.opportunity.findMany({ where: { assignedToId: employeeId }, select: { stage: true, estimatedValue: true } }),
    prisma.meeting.count({ where: { assignedToId: employeeId, ...dateFilter } }),
    prisma.proposal.count({ where: { assignedToId: employeeId, ...dateFilter } }),
    prisma.followUp.findMany({ where: { assignedToId: employeeId }, select: { completedAt: true, dueAt: true } }),
  ]);

  const leadsContacted = leads.filter((l) => l.lastContactedAt).length;
  const qualified = leads.filter((l) => l.status !== "NEW").length;
  const followUpsCompleted = followUps.filter((f) => f.completedAt).length;
  const overdueFollowUps = followUps.filter((f) => !f.completedAt && f.dueAt < new Date()).length;

  return {
    leadsGenerated: leads.length,
    leadsContacted,
    qualified,
    meetings,
    proposals,
    won: dealsWon(opportunities),
    lost: dealsLost(opportunities),
    revenue: revenueWon(opportunities),
    pipeline: pipelineValue(opportunities),
    conversionRate: conversionRate(opportunities),
    followUpsCompleted,
    overdueFollowUps,
  };
}

export default async function SalesReportsPage() {
  const user = await requireUser();
  if (!canAccessSalesCRM(user)) notFound();
  const owner = isOwner(user);

  if (!owner) {
    const report = await repReport(user.id);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Sales Report</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Your performance to date</p>
        </div>
        <Card className="p-5">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <Stat label="Leads generated" value={report.leadsGenerated} />
            <Stat label="Leads contacted" value={report.leadsContacted} />
            <Stat label="Qualified" value={report.qualified} />
            <Stat label="Meetings" value={report.meetings} />
            <Stat label="Proposals" value={report.proposals} />
            <Stat label="Won" value={report.won} />
            <Stat label="Lost" value={report.lost} />
            <Stat label="Conversion rate" value={`${report.conversionRate}%`} />
            <Stat label="Revenue" value={fmtCurrency(report.revenue)} />
            <Stat label="Pipeline" value={fmtCurrency(report.pipeline)} />
            <Stat label="Follow-ups completed" value={report.followUpsCompleted} />
            <Stat label="Overdue follow-ups" value={report.overdueFollowUps} />
          </dl>
        </Card>
      </div>
    );
  }

  const reps = await prisma.employee.findMany({ where: { role: "SALES_REP", active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const reports = await Promise.all(reps.map(async (r) => ({ rep: r, ...(await repReport(r.id)) })));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sales Team Report</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Comparing {reps.length} sales reps</p>
      </div>

      <Card className="p-5 overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="py-2 pr-4 font-medium whitespace-nowrap">Rep</th>
                <th className="py-2 pr-4 font-medium whitespace-nowrap text-right">Leads</th>
                <th className="py-2 pr-4 font-medium whitespace-nowrap text-right">Qualified</th>
                <th className="py-2 pr-4 font-medium whitespace-nowrap text-right">Proposals</th>
                <th className="py-2 pr-4 font-medium whitespace-nowrap text-right">Won</th>
                <th className="py-2 pr-4 font-medium whitespace-nowrap text-right">Lost</th>
                <th className="py-2 pr-4 font-medium whitespace-nowrap text-right">Revenue</th>
                <th className="py-2 pr-4 font-medium whitespace-nowrap text-right">Pipeline</th>
                <th className="py-2 pr-4 font-medium whitespace-nowrap text-right">Conv. rate</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.rep.id} className="border-t border-[var(--border)]">
                  <td className="py-2.5 pr-4 text-sm font-medium whitespace-nowrap">{r.rep.name}</td>
                  <td className="py-2.5 pr-4 text-sm text-right">{r.leadsGenerated}</td>
                  <td className="py-2.5 pr-4 text-sm text-right">{r.qualified}</td>
                  <td className="py-2.5 pr-4 text-sm text-right">{r.proposals}</td>
                  <td className="py-2.5 pr-4 text-sm text-right">{r.won}</td>
                  <td className="py-2.5 pr-4 text-sm text-right">{r.lost}</td>
                  <td className="py-2.5 pr-4 text-sm text-right whitespace-nowrap">{fmtCurrency(r.revenue)}</td>
                  <td className="py-2.5 pr-4 text-sm text-right whitespace-nowrap">{fmtCurrency(r.pipeline)}</td>
                  <td className="py-2.5 pr-4 text-sm text-right">{r.conversionRate}%</td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-sm text-[var(--muted)]">
                    No sales reps yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}
