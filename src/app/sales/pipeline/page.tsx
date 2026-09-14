export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/lib/ui";
import { requireUser, isOwner, canAccessSalesCRM, visibleSalesRepIds } from "@/lib/authorize";
import { PipelineBoard } from "./pipeline-board";
import { OpportunityForm } from "../opportunity-form";
import { pipelineValue, fmtCurrency } from "@/lib/sales-service";

export default async function PipelinePage() {
  const user = await requireUser();
  if (!canAccessSalesCRM(user)) notFound();
  const owner = isOwner(user);

  const scope = visibleSalesRepIds(user);
  const where = scope === "ALL" ? {} : { assignedToId: { in: scope } };

  const opportunities = await prisma.opportunity.findMany({
    where,
    include: { company: { select: { name: true } }, assignedTo: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const companies = await prisma.company.findMany({ where, select: { id: true, name: true }, orderBy: { name: "asc" } });

  const cards = opportunities.map((o) => ({
    id: o.id,
    name: o.name,
    companyName: o.company.name,
    contactPerson: o.contactPerson,
    estimatedValue: o.estimatedValue,
    stage: o.stage,
    priority: o.priority,
    expectedCloseDate: o.expectedCloseDate ? o.expectedCloseDate.toISOString() : null,
    nextFollowUpAt: null,
    repName: o.assignedTo.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{opportunities.length} opportunities · {fmtCurrency(pipelineValue(opportunities))} active</p>
        </div>
        <OpportunityForm companies={companies} />
      </div>

      <Card className="p-4 overflow-hidden">
        <PipelineBoard opportunities={cards} showRep={owner} />
      </Card>
    </div>
  );
}
