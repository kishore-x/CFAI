export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, SalesStageBadge, ProposalStatusBadge } from "@/lib/ui";
import { requireUser, canAccessSalesCRM, canAccessSalesRecord } from "@/lib/authorize";
import { ActivityTimeline } from "../../activity-timeline";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!canAccessSalesCRM(user)) notFound();

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { name: true } },
      opportunities: { orderBy: { createdAt: "desc" } },
      leads: { orderBy: { createdAt: "desc" } },
      proposals: { orderBy: { createdAt: "desc" } },
      followUps: { where: { completedAt: null }, orderBy: { dueAt: "asc" } },
      meetings: { orderBy: { scheduledAt: "desc" }, take: 5 },
    },
  });
  if (!company) notFound();
  if (!canAccessSalesRecord(user, company.assignedToId)) notFound();

  const activities = await prisma.salesActivity.findMany({
    where: { companyId: id },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full border border-[var(--border)] text-[var(--muted)]">{company.status}</span>
        </div>
        {company.contactPerson && <div className="text-sm text-[var(--muted)] mt-1">{company.contactPerson}{company.designation ? ` · ${company.designation}` : ""}</div>}
        <div className="text-xs text-[var(--muted)] mt-2">Owned by {company.assignedTo.name}</div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Email</dt><dd>{company.email ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Phone</dt><dd>{company.phone ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Website</dt><dd>{company.website ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Industry</dt><dd>{company.industry ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Location</dt><dd>{company.location ?? "—"}</dd></div>
          </dl>
          {company.notes && <p className="mt-3 text-[var(--muted)] text-xs">{company.notes}</p>}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-3">Open follow-ups</h2>
          <ul className="space-y-2 text-sm">
            {company.followUps.map((f) => (
              <li key={f.id} className="flex items-center justify-between">
                <span>{f.type}</span>
                <span className="text-xs text-[var(--muted)]">{new Date(f.dueAt).toLocaleDateString("en-GB")}</span>
              </li>
            ))}
            {company.followUps.length === 0 && <li className="text-[var(--muted)]">None scheduled.</li>}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Opportunities</h2>
        <ul className="space-y-2 text-sm">
          {company.opportunities.map((o) => (
            <li key={o.id} className="flex items-center justify-between">
              <Link href={`/sales/pipeline?opportunity=${o.id}`} className="hover:underline">{o.name}</Link>
              <span className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted)]">₹{Math.round(o.estimatedValue).toLocaleString("en-IN")}</span>
                <SalesStageBadge status={o.stage} />
              </span>
            </li>
          ))}
          {company.opportunities.length === 0 && <li className="text-[var(--muted)]">No opportunities yet.</li>}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Proposals</h2>
        <ul className="space-y-2 text-sm">
          {company.proposals.map((p) => (
            <li key={p.id} className="flex items-center justify-between">
              <span>{p.number}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted)]">₹{Math.round(p.finalAmount).toLocaleString("en-IN")}</span>
                <ProposalStatusBadge status={p.status} />
              </span>
            </li>
          ))}
          {company.proposals.length === 0 && <li className="text-[var(--muted)]">No proposals yet.</li>}
        </ul>
      </Card>

      <ActivityTimeline activities={activities} />
    </div>
  );
}
