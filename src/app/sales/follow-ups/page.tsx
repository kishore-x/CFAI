export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/lib/ui";
import { requireUser, isOwner, canAccessSalesCRM, visibleSalesRepIds } from "@/lib/authorize";
import { FollowUpForm } from "../follow-up-form";
import { FollowUpCard, type FollowUpItem } from "./follow-up-card";

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

function Section({ title, list, showRep }: { title: string; list: FollowUpItem[]; showRep: boolean }) {
  return (
    <Card className="p-5">
      <h2 className="font-semibold mb-3">
        {title} <span className="text-[var(--muted)] font-normal">({list.length})</span>
      </h2>
      <div className="space-y-2">
        {list.map((i) => (
          <FollowUpCard key={i.id} item={i} showRep={showRep} canEdit />
        ))}
        {list.length === 0 && <p className="text-sm text-[var(--muted)]">Nothing here.</p>}
      </div>
    </Card>
  );
}

export default async function FollowUpsPage() {
  const user = await requireUser();
  if (!canAccessSalesCRM(user)) notFound();
  const owner = isOwner(user);

  const scope = visibleSalesRepIds(user);
  const where = scope === "ALL" ? {} : { assignedToId: { in: scope } };

  const followUps = await prisma.followUp.findMany({
    where,
    include: { company: { select: { name: true } }, lead: { select: { companyName: true } }, assignedTo: { select: { name: true } } },
    orderBy: { dueAt: "asc" },
  });
  const companies = await prisma.company.findMany({ where, select: { id: true, name: true }, orderBy: { name: "asc" } });

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const items: FollowUpItem[] = followUps.map((f) => ({
    id: f.id,
    type: f.type,
    dueAt: f.dueAt.toISOString(),
    notes: f.notes,
    completedAt: f.completedAt ? f.completedAt.toISOString() : null,
    outcome: f.outcome,
    label: f.company?.name ?? f.lead?.companyName ?? "—",
    repName: f.assignedTo.name,
  }));

  const pending = items.filter((i) => !i.completedAt);
  const completed = items.filter((i) => i.completedAt);
  const today = pending.filter((i) => new Date(i.dueAt) >= todayStart && new Date(i.dueAt) <= todayEnd);
  const overdue = pending.filter((i) => new Date(i.dueAt) < todayStart);
  const upcoming = pending.filter((i) => new Date(i.dueAt) > todayEnd);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Follow-ups</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{pending.length} pending</p>
        </div>
        <FollowUpForm companies={companies} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Today" list={today} showRep={owner} />
        <Section title="Overdue" list={overdue} showRep={owner} />
        <Section title="Upcoming" list={upcoming} showRep={owner} />
        <Section title="Completed" list={completed.slice(0, 20)} showRep={owner} />
      </div>
    </div>
  );
}
