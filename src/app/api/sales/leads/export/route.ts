import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { requireUser, canAccessSalesCRM, visibleSalesRepIds } from "@/lib/authorize";

export const dynamic = "force-dynamic";

// Exports the caller's own leads (or, for Owner, all/filtered) as a real
// .xlsx file — same RBAC scoping as the Leads page, so this can never leak
// another rep's records. Sales Reps use this to hand the Owner a printable
// hard-copy snapshot of their pipeline.
export async function GET(request: Request) {
  const user = await requireUser();
  if (!canAccessSalesCRM(user)) {
    return new Response("Not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const source = searchParams.get("source") || undefined;
  const q = searchParams.get("q") || undefined;

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
    include: { assignedTo: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ClickfieldAI Hub";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Leads", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  sheet.columns = [
    { header: "Company", key: "companyName", width: 26 },
    { header: "Contact Person", key: "contactPerson", width: 20 },
    { header: "Designation", key: "designation", width: 18 },
    { header: "Email", key: "email", width: 26 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Website", key: "website", width: 22 },
    { header: "Industry", key: "industry", width: 16 },
    { header: "Location", key: "location", width: 16 },
    { header: "Source", key: "source", width: 14 },
    { header: "Estimated Value (₹)", key: "estimatedValue", width: 18 },
    { header: "Status", key: "status", width: 14 },
    { header: "Sales Rep", key: "repName", width: 18 },
    { header: "Created", key: "createdAt", width: 14 },
    { header: "Last Contacted", key: "lastContactedAt", width: 16 },
    { header: "Next Follow-up", key: "nextFollowUpAt", width: 16 },
    { header: "Notes", key: "notes", width: 30 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E5E5" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: "P1" };

  for (const lead of leads) {
    sheet.addRow({
      companyName: lead.companyName,
      contactPerson: lead.contactPerson ?? "",
      designation: lead.designation ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      website: lead.website ?? "",
      industry: lead.industry ?? "",
      location: lead.location ?? "",
      source: lead.source ?? "",
      estimatedValue: lead.estimatedValue ?? "",
      status: lead.status,
      repName: lead.assignedTo.name,
      createdAt: lead.createdAt.toLocaleDateString("en-GB"),
      lastContactedAt: lead.lastContactedAt ? lead.lastContactedAt.toLocaleDateString("en-GB") : "",
      nextFollowUpAt: lead.nextFollowUpAt ? lead.nextFollowUpAt.toLocaleDateString("en-GB") : "",
      notes: lead.notes ?? "",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `leads-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
