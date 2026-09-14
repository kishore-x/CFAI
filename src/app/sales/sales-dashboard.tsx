import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, StatCard, SalesStageBadge } from "@/lib/ui";
import {
  currentMonthRange,
  achievementPercent,
  revenueWon,
  pipelineValue,
  dealsWon,
  dealsLost,
  fmtCurrency,
} from "@/lib/sales-service";

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}
function endOfDay(d: Date) {
  const c = new Date(d);
  c.setUTCHours(23, 59, 59, 999);
  return c;
}

export async function SalesRepDashboard({ userId, userName }: { userId: string; userName: string }) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const { year, month } = currentMonthRange(now);

  const [leads, opportunities, followUps, meetings, proposalsSent, target, recentLeads, recentActivities] = await Promise.all([
    prisma.lead.findMany({ where: { assignedToId: userId }, select: { status: true } }),
    prisma.opportunity.findMany({ where: { assignedToId: userId }, select: { stage: true, estimatedValue: true } }),
    prisma.followUp.findMany({ where: { assignedToId: userId, completedAt: null }, select: { dueAt: true } }),
    prisma.meeting.findMany({ where: { assignedToId: userId, completedAt: null, scheduledAt: { gte: todayStart } }, orderBy: { scheduledAt: "asc" }, take: 5, include: { company: true, lead: true } }),
    prisma.proposal.count({ where: { assignedToId: userId, status: { not: "DRAFT" } } }),
    prisma.salesTarget.findUnique({ where: { employeeId_year_month: { employeeId: userId, year, month } } }),
    prisma.lead.findMany({ where: { assignedToId: userId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.salesActivity.findMany({
      where: { OR: [{ actorId: userId }, { company: { assignedToId: userId } }, { lead: { assignedToId: userId } }, { opportunity: { assignedToId: userId } }] },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const todaysFollowUps = followUps.filter((f) => f.dueAt >= todayStart && f.dueAt <= todayEnd);
  const overdueFollowUps = followUps.filter((f) => f.dueAt < todayStart);
  const achieved = revenueWon(opportunities);
  const targetAmount = target?.targetAmount ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {userName.split(" ")[0]}</h1>
        <p className="text-sm text-[var(--muted)] mt-1">{now.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total leads" value={leads.length} />
        <StatCard label="New leads" value={leads.filter((l) => l.status === "NEW").length} />
        <StatCard label="Qualified" value={leads.filter((l) => l.status !== "NEW" && l.status !== "LOST").length} />
        <StatCard label="Follow-ups today" value={todaysFollowUps.length} />
        <StatCard label="Overdue follow-ups" value={overdueFollowUps.length} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Upcoming meetings" value={meetings.length} />
        <StatCard label="Proposals sent" value={proposalsSent} />
        <StatCard label="Deals won" value={dealsWon(opportunities)} />
        <StatCard label="Deals lost" value={dealsLost(opportunities)} />
        <StatCard label="Pipeline value" value={fmtCurrency(pipelineValue(opportunities))} />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Target achievement</h2>
          <span className="text-sm text-[var(--muted)]">{achievementPercent(achieved, targetAmount)}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, achievementPercent(achieved, targetAmount))}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
          <span>Target: {fmtCurrency(targetAmount)}</span>
          <span>Won: {fmtCurrency(achieved)}</span>
          <Link href="/sales/targets" className="text-[var(--accent)] hover:underline">
            View targets
          </Link>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Today&apos;s follow-ups</h2>
            <Link href="/sales/follow-ups" className="text-sm text-[var(--accent)] font-medium hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {todaysFollowUps.slice(0, 6).map((f, i) => (
              <li key={i} className="text-[var(--muted)]">Due {new Date(f.dueAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</li>
            ))}
            {todaysFollowUps.length === 0 && <li className="text-[var(--muted)]">Nothing due today.</li>}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Upcoming meetings</h2>
            <Link href="/sales/meetings" className="text-sm text-[var(--accent)] font-medium hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {meetings.map((m) => (
              <li key={m.id} className="flex items-center justify-between">
                <span>{m.company?.name ?? m.lead?.companyName ?? "—"}</span>
                <span className="text-xs text-[var(--muted)]">{new Date(m.scheduledAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
            {meetings.length === 0 && <li className="text-[var(--muted)]">No upcoming meetings.</li>}
          </ul>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent leads</h2>
            <Link href="/sales/leads" className="text-sm text-[var(--accent)] font-medium hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {recentLeads.map((l) => (
              <li key={l.id} className="flex items-center justify-between">
                <Link href={`/sales/leads/${l.id}`} className="hover:underline truncate">
                  {l.companyName}
                </Link>
                <SalesStageBadge status={l.status} />
              </li>
            ))}
            {recentLeads.length === 0 && <li className="text-[var(--muted)]">No leads yet.</li>}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-4">Recent activity</h2>
          <ul className="space-y-2 text-sm">
            {recentActivities.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-[var(--muted)]">
                <span className="truncate text-[var(--foreground)]">{a.description}</span>
                <span className="text-xs shrink-0 ml-2">{new Date(a.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
              </li>
            ))}
            {recentActivities.length === 0 && <li className="text-[var(--muted)]">No activity yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
