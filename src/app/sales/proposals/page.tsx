export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/lib/ui";
import { requireUser, isOwner, canAccessSalesCRM, visibleSalesRepIds } from "@/lib/authorize";
import { ProposalForm } from "../proposal-form";
import { ProposalStatusSelect } from "./proposal-status-select";

export default async function ProposalsPage() {
  const user = await requireUser();
  if (!canAccessSalesCRM(user)) notFound();
  const owner = isOwner(user);

  const scope = visibleSalesRepIds(user);
  const where = scope === "ALL" ? {} : { assignedToId: { in: scope } };

  const proposals = await prisma.proposal.findMany({
    where,
    include: { company: { select: { name: true } }, assignedTo: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const companies = await prisma.company.findMany({ where, select: { id: true, name: true }, orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Proposals</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{proposals.length} proposals</p>
        </div>
        <ProposalForm companies={companies} />
      </div>

      <Card className="p-5 overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="py-2 pr-3 font-medium whitespace-nowrap">Number</th>
                <th className="py-2 pr-3 font-medium whitespace-nowrap">Company</th>
                <th className="py-2 pr-3 font-medium whitespace-nowrap text-right">Amount</th>
                {owner && <th className="py-2 pr-3 font-medium whitespace-nowrap">Rep</th>}
                <th className="py-2 pr-3 font-medium whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="py-2.5 pr-3 text-sm whitespace-nowrap">{p.number}</td>
                  <td className="py-2.5 pr-3 text-sm truncate">{p.company.name}</td>
                  <td className="py-2.5 pr-3 text-sm text-right whitespace-nowrap">₹{Math.round(p.finalAmount).toLocaleString("en-IN")}</td>
                  {owner && <td className="py-2.5 pr-3 text-sm whitespace-nowrap">{p.assignedTo.name}</td>}
                  <td className="py-2.5 pr-3">
                    <ProposalStatusSelect proposalId={p.id} status={p.status} />
                  </td>
                </tr>
              ))}
              {proposals.length === 0 && (
                <tr>
                  <td colSpan={owner ? 5 : 4} className="py-4 text-center text-sm text-[var(--muted)]">
                    No proposals yet.
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
