export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/lib/ui";
import { requireUser, isOwner, canAccessSalesCRM, visibleSalesRepIds } from "@/lib/authorize";
import { AddActivityForm } from "./add-activity-form";

export default async function ActivitiesPage() {
  const user = await requireUser();
  if (!canAccessSalesCRM(user)) notFound();
  const owner = isOwner(user);
  const scope = visibleSalesRepIds(user);

  const activities = await prisma.salesActivity.findMany({
    where:
      scope === "ALL"
        ? {}
        : {
            OR: [
              { actorId: { in: scope } },
              { company: { assignedToId: { in: scope } } },
              { lead: { assignedToId: { in: scope } } },
              { opportunity: { assignedToId: { in: scope } } },
            ],
          },
    include: {
      actor: { select: { name: true } },
      lead: { select: { id: true, companyName: true } },
      company: { select: { id: true, name: true } },
      opportunity: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activities</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Recent sales activity{owner ? " across the team" : ""}</p>
      </div>

      <Card className="p-5">
        <AddActivityForm />
      </Card>

      <Card className="p-5">
        <ul className="space-y-3 text-sm">
          {activities.map((a) => {
            const link = a.lead ? `/sales/leads/${a.lead.id}` : a.company ? `/sales/companies/${a.company.id}` : null;
            const label = a.lead?.companyName ?? a.company?.name ?? a.opportunity?.name;
            return (
              <li key={a.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate">
                    {a.description}
                    {label && (
                      <span className="text-[var(--muted)]">
                        {" — "}
                        {link ? (
                          <Link href={link} className="hover:underline">
                            {label}
                          </Link>
                        ) : (
                          label
                        )}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">{a.actor.name}</div>
                </div>
                <span className="text-xs text-[var(--muted)] shrink-0">
                  {new Date(a.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            );
          })}
          {activities.length === 0 && <li className="text-sm text-[var(--muted)]">No activity yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
