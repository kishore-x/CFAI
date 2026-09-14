export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, SalesStageBadge } from "@/lib/ui";
import { requireUser, isOwner, canAccessSalesCRM, visibleSalesRepIds } from "@/lib/authorize";
import { LeadForm } from "../lead-form";

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "MEETING", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string; source?: string; q?: string }> }) {
  const user = await requireUser();
  if (!canAccessSalesCRM(user)) notFound();
  const owner = isOwner(user);
  const { status, source, q } = await searchParams;

  const scope = visibleSalesRepIds(user);
  const leads = await prisma.lead.findMany({
    where: {
      ...(scope === "ALL" ? {} : { assignedToId: { in: scope } }),
      ...(status ? { status: status as never } : {}),
      ...(source ? { source: { contains: source, mode: "insensitive" } } : {}),
      ...(q
        ? {
            OR: [
              { companyName: { contains: q, mode: "insensitive" } },
              { contactPerson: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { assignedTo: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const reps = owner ? await prisma.employee.findMany({ where: { role: "SALES_REP", active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : [];
  const sources = Array.from(new Set(leads.map((l) => l.source).filter(Boolean))) as string[];

  const exportParams = new URLSearchParams();
  if (status) exportParams.set("status", status);
  if (source) exportParams.set("source", source);
  if (q) exportParams.set("q", q);
  const exportHref = `/api/sales/leads/export${exportParams.toString() ? `?${exportParams.toString()}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{leads.length} leads</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={exportHref} className="text-xs font-medium px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-white/10">
            Export to Excel
          </a>
          <LeadForm reps={reps} />
        </div>
      </div>

      <Card className="p-3">
        <form className="flex flex-wrap items-center gap-2 text-xs">
          <input name="q" defaultValue={q ?? ""} placeholder="Search company / contact" className="rounded-md border border-[var(--border)] bg-transparent px-2.5 py-1.5 outline-none focus:border-white/60" />
          <select name="status" defaultValue={status ?? ""} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5">
            <option value="">All statuses</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select name="source" defaultValue={source ?? ""} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5">
            <option value="">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="submit" className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-[var(--border)] hover:bg-white/10">
            Filter
          </button>
          {(status || source || q) && (
            <Link href="/sales/leads" className="text-[var(--muted)] hover:underline">
              Clear
            </Link>
          )}
        </form>
      </Card>

      <Card className="p-5 overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="py-2 pr-3 font-medium whitespace-nowrap">Company</th>
                <th className="py-2 pr-3 font-medium whitespace-nowrap">Contact</th>
                <th className="py-2 pr-3 font-medium whitespace-nowrap">Status</th>
                <th className="py-2 pr-3 font-medium whitespace-nowrap text-right">Value</th>
                {owner && <th className="py-2 pr-3 font-medium whitespace-nowrap">Rep</th>}
                <th className="py-2 pr-3 font-medium whitespace-nowrap">Next follow-up</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t border-[var(--border)]">
                  <td className="py-2.5 pr-3 text-sm truncate">
                    <Link href={`/sales/leads/${l.id}`} className="hover:underline font-medium">
                      {l.companyName}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 text-sm text-[var(--muted)] whitespace-nowrap">{l.contactPerson ?? "—"}</td>
                  <td className="py-2.5 pr-3">
                    <SalesStageBadge status={l.status} />
                  </td>
                  <td className="py-2.5 pr-3 text-sm text-right whitespace-nowrap">{l.estimatedValue ? `₹${Math.round(l.estimatedValue).toLocaleString("en-IN")}` : "—"}</td>
                  {owner && <td className="py-2.5 pr-3 text-sm whitespace-nowrap">{l.assignedTo.name}</td>}
                  <td className="py-2.5 pr-3 text-sm text-[var(--muted)] whitespace-nowrap">{l.nextFollowUpAt ? new Date(l.nextFollowUpAt).toLocaleDateString("en-GB") : "—"}</td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={owner ? 6 : 5} className="py-4 text-center text-sm text-[var(--muted)]">
                    No leads yet.
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
