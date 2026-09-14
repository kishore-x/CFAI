export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, SalesStageBadge } from "@/lib/ui";
import { requireUser, canAccessSalesCRM, canAccessSalesRecord } from "@/lib/authorize";
import { LeadDetailControls } from "../lead-detail-controls";
import { ActivityTimeline } from "../../activity-timeline";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!canAccessSalesCRM(user)) notFound();

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { assignedTo: { select: { id: true, name: true } }, opportunity: { select: { id: true, name: true, stage: true } } },
  });
  if (!lead) notFound();
  // Server-side ownership check — never rely on the UI hiding this page.
  if (!canAccessSalesRecord(user, lead.assignedToId)) notFound();

  const activities = await prisma.salesActivity.findMany({
    where: { leadId: id },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const followUps = await prisma.followUp.findMany({ where: { leadId: id }, orderBy: { dueAt: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{lead.companyName}</h1>
            <SalesStageBadge status={lead.status} />
          </div>
          {lead.contactPerson && <div className="text-sm text-[var(--muted)] mt-1">{lead.contactPerson}{lead.designation ? ` · ${lead.designation}` : ""}</div>}
          <div className="text-xs text-[var(--muted)] mt-2">Owned by {lead.assignedTo.name}</div>
        </div>
      </div>

      <Card className="p-5">
        <LeadDetailControls leadId={lead.id} status={lead.status} canEdit />
      </Card>

      {lead.opportunity && (
        <Card className="p-4 border-[var(--border-30)]">
          <span className="text-sm">
            Converted to opportunity: <span className="font-medium">{lead.opportunity.name}</span> (<SalesStageBadge status={lead.opportunity.stage} />)
          </span>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Email</dt><dd>{lead.email ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Phone</dt><dd>{lead.phone ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Website</dt><dd>{lead.website ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Industry</dt><dd>{lead.industry ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Location</dt><dd>{lead.location ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Source</dt><dd>{lead.source ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Estimated value</dt><dd>{lead.estimatedValue ? `₹${Math.round(lead.estimatedValue).toLocaleString("en-IN")}` : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Created</dt><dd>{new Date(lead.createdAt).toLocaleDateString("en-GB")}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Last contacted</dt><dd>{lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleDateString("en-GB") : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Next follow-up</dt><dd>{lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleDateString("en-GB") : "—"}</dd></div>
          </dl>
          {lead.notes && <p className="mt-3 text-[var(--muted)] text-xs">{lead.notes}</p>}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-3">Follow-ups</h2>
          <ul className="space-y-2 text-sm">
            {followUps.map((f) => (
              <li key={f.id} className="flex items-center justify-between">
                <span>{f.type} — {new Date(f.dueAt).toLocaleDateString("en-GB")}</span>
                <span className="text-xs text-[var(--muted)]">{f.completedAt ? "Completed" : "Pending"}</span>
              </li>
            ))}
            {followUps.length === 0 && <li className="text-[var(--muted)]">No follow-ups scheduled.</li>}
          </ul>
        </Card>
      </div>

      <ActivityTimeline activities={activities} />
    </div>
  );
}
