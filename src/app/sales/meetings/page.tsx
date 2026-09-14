export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/lib/ui";
import { requireUser, isOwner, canAccessSalesCRM, visibleSalesRepIds } from "@/lib/authorize";
import { MeetingForm } from "../meeting-form";
import { MeetingCard, type MeetingItem } from "./meeting-card";

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

function Section({ title, list, showRep }: { title: string; list: MeetingItem[]; showRep: boolean }) {
  return (
    <Card className="p-5">
      <h2 className="font-semibold mb-3">
        {title} <span className="text-[var(--muted)] font-normal">({list.length})</span>
      </h2>
      <div className="space-y-2">
        {list.map((i) => (
          <MeetingCard key={i.id} item={i} showRep={showRep} />
        ))}
        {list.length === 0 && <p className="text-sm text-[var(--muted)]">Nothing here.</p>}
      </div>
    </Card>
  );
}

export default async function MeetingsPage() {
  const user = await requireUser();
  if (!canAccessSalesCRM(user)) notFound();
  const owner = isOwner(user);

  const scope = visibleSalesRepIds(user);
  const where = scope === "ALL" ? {} : { assignedToId: { in: scope } };

  const meetings = await prisma.meeting.findMany({
    where,
    include: { company: { select: { name: true } }, lead: { select: { companyName: true } }, assignedTo: { select: { name: true } } },
    orderBy: { scheduledAt: "asc" },
  });
  const companies = await prisma.company.findMany({ where, select: { id: true, name: true }, orderBy: { name: "asc" } });

  const items: MeetingItem[] = meetings.map((m) => ({
    id: m.id,
    scheduledAt: m.scheduledAt.toISOString(),
    meetingType: m.meetingType,
    location: m.location,
    notes: m.notes,
    completedAt: m.completedAt ? m.completedAt.toISOString() : null,
    outcome: m.outcome,
    label: m.company?.name ?? m.lead?.companyName ?? "—",
    repName: m.assignedTo.name,
  }));

  const now = new Date();
  const pending = items.filter((i) => !i.completedAt);
  const today = pending.filter((i) => new Date(i.scheduledAt) >= startOfDay(now) && new Date(i.scheduledAt) <= endOfDay(now));
  const upcoming = pending.filter((i) => new Date(i.scheduledAt) > endOfDay(now));
  const completed = items.filter((i) => i.completedAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{pending.length} upcoming</p>
        </div>
        <MeetingForm companies={companies} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Section title="Today" list={today} showRep={owner} />
        <Section title="Upcoming" list={upcoming} showRep={owner} />
        <Section title="Completed" list={completed.slice(0, 20)} showRep={owner} />
      </div>
    </div>
  );
}
