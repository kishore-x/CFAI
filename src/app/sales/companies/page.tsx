export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/lib/ui";
import { requireUser, isOwner, canAccessSalesCRM, visibleSalesRepIds } from "@/lib/authorize";
import { CompanyForm } from "../company-form";

export default async function CompaniesPage() {
  const user = await requireUser();
  if (!canAccessSalesCRM(user)) notFound();
  const owner = isOwner(user);

  const scope = visibleSalesRepIds(user);
  const companies = await prisma.company.findMany({
    where: scope === "ALL" ? {} : { assignedToId: { in: scope } },
    include: { assignedTo: { select: { name: true } }, opportunities: { select: { id: true, stage: true, estimatedValue: true } } },
    orderBy: { createdAt: "desc" },
  });

  const reps = owner ? await prisma.employee.findMany({ where: { role: "SALES_REP", active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{companies.length} companies / prospects</p>
        </div>
        <CompanyForm reps={reps} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {companies.map((c) => {
          const activeValue = c.opportunities.filter((o) => o.stage !== "WON" && o.stage !== "LOST").reduce((s, o) => s + o.estimatedValue, 0);
          return (
            <Link key={c.id} href={`/sales/companies/${c.id}`}>
              <Card className="p-5 h-full hover:border-[var(--border-30)] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{c.name}</h2>
                    {c.contactPerson && <div className="text-xs text-[var(--muted)] mt-0.5">{c.contactPerson}</div>}
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full border border-[var(--border)] text-[var(--muted)] shrink-0">{c.status}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                  <span>{c.opportunities.length} opportunities</span>
                  {activeValue > 0 && <span>₹{Math.round(activeValue).toLocaleString("en-IN")} active</span>}
                  {owner && <span>{c.assignedTo.name}</span>}
                </div>
              </Card>
            </Link>
          );
        })}
        {companies.length === 0 && (
          <Card className="p-8 text-center text-sm text-[var(--muted)] md:col-span-2">No companies yet.</Card>
        )}
      </div>
    </div>
  );
}
