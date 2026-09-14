"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUser, isOwner, assertSalesCRMAccess, assertCanAccessSalesRecord } from "@/lib/authorize";
import {
  sendLeadAssignedEmail,
  sendProposalStatusChangeEmail,
  sendDealStatusChangeEmail,
} from "@/lib/email";

// Every sales record is independently owned via `assignedToId`. Create
// helpers resolve it the same way everywhere: a Sales Rep always creates for
// themselves; an Owner may optionally hand it to a specific rep (falling
// back to themselves) — never trust a client-sent id beyond that.
function resolveOwner(user: { id: string }, owner: boolean, requestedAssigneeId?: string) {
  if (owner && requestedAssigneeId) return requestedAssigneeId;
  return user.id;
}

async function logSalesActivity(params: {
  actorId: string;
  type: string;
  description: string;
  companyId?: string | null;
  leadId?: string | null;
  opportunityId?: string | null;
}) {
  await prisma.salesActivity.create({
    data: {
      actorId: params.actorId,
      type: params.type,
      description: params.description,
      companyId: params.companyId ?? undefined,
      leadId: params.leadId ?? undefined,
      opportunityId: params.opportunityId ?? undefined,
    },
  });
}

function revalidateSales() {
  revalidatePath("/sales");
  revalidatePath("/sales/leads");
  revalidatePath("/sales/companies");
  revalidatePath("/sales/pipeline");
  revalidatePath("/sales/follow-ups");
  revalidatePath("/sales/meetings");
  revalidatePath("/sales/proposals");
  revalidatePath("/sales/activities");
  revalidatePath("/sales/reports");
  revalidatePath("/");
}

// ---------- Companies ----------

export async function createCompany(input: {
  name: string;
  contactPerson?: string;
  designation?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  location?: string;
  leadSource?: string;
  estimatedValue?: number;
  notes?: string;
  assignedToId?: string;
}) {
  const user = await requireUser();
  assertSalesCRMAccess(user);
  const owner = isOwner(user);

  const company = await prisma.company.create({
    data: {
      name: input.name,
      contactPerson: input.contactPerson,
      designation: input.designation,
      email: input.email,
      phone: input.phone,
      website: input.website,
      industry: input.industry,
      location: input.location,
      leadSource: input.leadSource,
      estimatedValue: input.estimatedValue,
      notes: input.notes,
      assignedToId: resolveOwner(user, owner, input.assignedToId),
    },
  });
  revalidateSales();
  return company;
}

export async function updateCompany(
  companyId: string,
  input: Partial<{
    name: string;
    contactPerson: string;
    designation: string;
    email: string;
    phone: string;
    website: string;
    industry: string;
    location: string;
    leadSource: string;
    estimatedValue: number | null;
    status: string;
    notes: string;
  }>
) {
  const user = await requireUser();
  assertSalesCRMAccess(user);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  assertCanAccessSalesRecord(user, company.assignedToId);

  await prisma.company.update({ where: { id: companyId }, data: input });
  revalidateSales();
}

// ---------- Leads ----------

export async function createLead(input: {
  companyName: string;
  contactPerson?: string;
  designation?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  location?: string;
  source?: string;
  estimatedValue?: number;
  notes?: string;
  nextFollowUpAt?: string;
  assignedToId?: string;
}) {
  const user = await requireUser();
  assertSalesCRMAccess(user);
  const owner = isOwner(user);
  const assignedToId = resolveOwner(user, owner, input.assignedToId);

  const lead = await prisma.lead.create({
    data: {
      companyName: input.companyName,
      contactPerson: input.contactPerson,
      designation: input.designation,
      email: input.email,
      phone: input.phone,
      website: input.website,
      industry: input.industry,
      location: input.location,
      source: input.source,
      estimatedValue: input.estimatedValue,
      notes: input.notes,
      nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null,
      assignedToId,
    },
  });

  await logSalesActivity({ actorId: user.id, type: "LEAD_CREATED", description: `Lead created: ${lead.companyName}`, leadId: lead.id });

  if (owner && assignedToId !== user.id) {
    await sendLeadAssignedEmail({
      recipientId: assignedToId,
      leadId: lead.id,
      companyName: lead.companyName,
      contactPerson: lead.contactPerson,
      estimatedValue: lead.estimatedValue,
      source: lead.source,
    });
  }

  revalidateSales();
  return lead;
}

export async function updateLead(
  leadId: string,
  input: Partial<{
    companyName: string;
    contactPerson: string;
    designation: string;
    email: string;
    phone: string;
    website: string;
    industry: string;
    location: string;
    source: string;
    estimatedValue: number | null;
    notes: string;
    nextFollowUpAt: string | null;
    lastContactedAt: string | null;
  }>
) {
  const user = await requireUser();
  assertSalesCRMAccess(user);
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  assertCanAccessSalesRecord(user, lead.assignedToId);

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      ...input,
      nextFollowUpAt: input.nextFollowUpAt !== undefined ? (input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null) : undefined,
      lastContactedAt: input.lastContactedAt !== undefined ? (input.lastContactedAt ? new Date(input.lastContactedAt) : null) : undefined,
    },
  });
  revalidateSales();
}

export async function updateLeadStatus(leadId: string, status: string) {
  const user = await requireUser();
  assertSalesCRMAccess(user);
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  assertCanAccessSalesRecord(user, lead.assignedToId);

  await prisma.lead.update({ where: { id: leadId }, data: { status: status as never } });
  await logSalesActivity({ actorId: user.id, type: "STATUS_CHANGE", description: `Lead status changed to ${status}`, leadId });
  revalidateSales();
}

export async function addLeadNote(leadId: string, note: string) {
  const user = await requireUser();
  assertSalesCRMAccess(user);
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  assertCanAccessSalesRecord(user, lead.assignedToId);
  const trimmed = note.trim();
  if (!trimmed) return;

  await logSalesActivity({ actorId: user.id, type: "NOTE", description: trimmed, leadId });
  await prisma.lead.update({ where: { id: leadId }, data: { lastContactedAt: new Date() } });
  revalidateSales();
}

/** Converts a lead into a Company (if not already linked) + Opportunity, and marks the lead QUALIFIED. */
export async function convertLeadToOpportunity(leadId: string, opportunityName?: string) {
  const user = await requireUser();
  assertSalesCRMAccess(user);
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  assertCanAccessSalesRecord(user, lead.assignedToId);

  let companyId = lead.companyId;
  if (!companyId) {
    const company = await prisma.company.create({
      data: {
        name: lead.companyName,
        contactPerson: lead.contactPerson,
        designation: lead.designation,
        email: lead.email,
        phone: lead.phone,
        website: lead.website,
        industry: lead.industry,
        location: lead.location,
        leadSource: lead.source,
        estimatedValue: lead.estimatedValue,
        status: "CUSTOMER",
        assignedToId: lead.assignedToId,
      },
    });
    companyId = company.id;
    await prisma.lead.update({ where: { id: leadId }, data: { companyId } });
  }

  const opportunity = await prisma.opportunity.create({
    data: {
      name: opportunityName?.trim() || lead.companyName,
      companyId,
      leadId: lead.id,
      contactPerson: lead.contactPerson,
      estimatedValue: lead.estimatedValue ?? 0,
      assignedToId: lead.assignedToId,
      stage: "QUALIFIED",
    },
  });

  await prisma.lead.update({ where: { id: leadId }, data: { status: "QUALIFIED" } });
  await logSalesActivity({
    actorId: user.id,
    type: "CONVERTED",
    description: `Lead converted to opportunity: ${opportunity.name}`,
    leadId,
    companyId,
    opportunityId: opportunity.id,
  });

  revalidateSales();
  return opportunity;
}

export async function markLeadLost(leadId: string, reason?: string) {
  const user = await requireUser();
  assertSalesCRMAccess(user);
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  assertCanAccessSalesRecord(user, lead.assignedToId);

  await prisma.lead.update({ where: { id: leadId }, data: { status: "LOST" } });
  await logSalesActivity({
    actorId: user.id,
    type: "STATUS_CHANGE",
    description: reason ? `Lead marked lost: ${reason}` : "Lead marked lost",
    leadId,
  });
  revalidateSales();
}

// ---------- Opportunities ----------

export async function createOpportunity(input: {
  name: string;
  companyId: string;
  contactPerson?: string;
  estimatedValue?: number;
  probability?: number;
  expectedCloseDate?: string;
  priority?: string;
  notes?: string;
  assignedToId?: string;
}) {
  const user = await requireUser();
  assertSalesCRMAccess(user);
  const owner = isOwner(user);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: input.companyId } });
  assertCanAccessSalesRecord(user, company.assignedToId);

  const opportunity = await prisma.opportunity.create({
    data: {
      name: input.name,
      companyId: input.companyId,
      contactPerson: input.contactPerson,
      estimatedValue: input.estimatedValue ?? 0,
      probability: input.probability ?? 50,
      expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
      priority: (input.priority as never) ?? "MEDIUM",
      notes: input.notes,
      assignedToId: resolveOwner(user, owner, input.assignedToId ?? company.assignedToId),
    },
  });
  await logSalesActivity({ actorId: user.id, type: "OPPORTUNITY_CREATED", description: `Opportunity created: ${opportunity.name}`, companyId: input.companyId, opportunityId: opportunity.id });
  revalidateSales();
  return opportunity;
}

export async function updateOpportunity(
  opportunityId: string,
  input: Partial<{
    name: string;
    contactPerson: string;
    estimatedValue: number;
    probability: number;
    expectedCloseDate: string | null;
    priority: string;
    notes: string;
  }>
) {
  const user = await requireUser();
  assertSalesCRMAccess(user);
  const opp = await prisma.opportunity.findUniqueOrThrow({ where: { id: opportunityId } });
  assertCanAccessSalesRecord(user, opp.assignedToId);

  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      ...input,
      priority: input.priority as never,
      expectedCloseDate: input.expectedCloseDate !== undefined ? (input.expectedCloseDate ? new Date(input.expectedCloseDate) : null) : undefined,
    },
  });
  revalidateSales();
}

export async function updateOpportunityStage(opportunityId: string, stage: string) {
  const user = await requireUser();
  assertSalesCRMAccess(user);
  const opp = await prisma.opportunity.findUniqueOrThrow({ where: { id: opportunityId }, include: { company: true } });
  assertCanAccessSalesRecord(user, opp.assignedToId);

  await prisma.opportunity.update({ where: { id: opportunityId }, data: { stage: stage as never } });
  await logSalesActivity({
    actorId: user.id,
    type: "STAGE_CHANGE",
    description: `${opp.name} moved to ${stage}`,
    companyId: opp.companyId,
    opportunityId,
  });

  if (stage === "WON" || stage === "LOST") {
    await sendDealStatusChangeEmail({
      recipientId: opp.assignedToId,
      opportunityId,
      opportunityName: opp.name,
      companyName: opp.company.name,
      won: stage === "WON",
      estimatedValue: opp.estimatedValue,
    });
  }
  revalidateSales();
}

// ---------- Follow-ups ----------

export async function createFollowUp(input: {
  type?: string;
  dueAt: string;
  notes?: string;
  companyId?: string;
  leadId?: string;
  opportunityId?: string;
  assignedToId?: string;
}) {
  const user = await requireUser();
  assertSalesCRMAccess(user);
  const owner = isOwner(user);

  const followUp = await prisma.followUp.create({
    data: {
      type: (input.type as never) ?? "CALL",
      dueAt: new Date(input.dueAt),
      notes: input.notes,
      companyId: input.companyId,
      leadId: input.leadId,
      opportunityId: input.opportunityId,
      assignedToId: resolveOwner(user, owner, input.assignedToId),
    },
  });
  revalidateSales();
  return followUp;
}

export async function completeFollowUp(followUpId: string, outcome: string, nextFollowUp?: { dueAt: string; type?: string; notes?: string }) {
  const user = await requireUser();
  assertSalesCRMAccess(user);
  const followUp = await prisma.followUp.findUniqueOrThrow({ where: { id: followUpId } });
  assertCanAccessSalesRecord(user, followUp.assignedToId);

  await prisma.followUp.update({ where: { id: followUpId }, data: { completedAt: new Date(), outcome } });
  await logSalesActivity({
    actorId: user.id,
    type: "FOLLOW_UP_COMPLETED",
    description: `Follow-up completed: ${outcome}`,
    companyId: followUp.companyId,
    leadId: followUp.leadId,
    opportunityId: followUp.opportunityId,
  });

  if (followUp.leadId) {
    await prisma.lead.update({ where: { id: followUp.leadId }, data: { lastContactedAt: new Date() } });
  }

  if (nextFollowUp) {
    await prisma.followUp.create({
      data: {
        type: (nextFollowUp.type as never) ?? followUp.type,
        dueAt: new Date(nextFollowUp.dueAt),
        notes: nextFollowUp.notes,
        companyId: followUp.companyId,
        leadId: followUp.leadId,
        opportunityId: followUp.opportunityId,
        assignedToId: followUp.assignedToId,
      },
    });
    if (followUp.leadId) {
      await prisma.lead.update({ where: { id: followUp.leadId }, data: { nextFollowUpAt: new Date(nextFollowUp.dueAt) } });
    }
  }
  revalidateSales();
}

// ---------- Meetings ----------

export async function createMeeting(input: {
  contactPerson?: string;
  scheduledAt: string;
  meetingType?: string;
  location?: string;
  notes?: string;
  companyId?: string;
  leadId?: string;
  opportunityId?: string;
  assignedToId?: string;
}) {
  const user = await requireUser();
  assertSalesCRMAccess(user);
  const owner = isOwner(user);

  const meeting = await prisma.meeting.create({
    data: {
      contactPerson: input.contactPerson,
      scheduledAt: new Date(input.scheduledAt),
      meetingType: input.meetingType ?? "CALL",
      location: input.location,
      notes: input.notes,
      companyId: input.companyId,
      leadId: input.leadId,
      opportunityId: input.opportunityId,
      assignedToId: resolveOwner(user, owner, input.assignedToId),
    },
  });
  await logSalesActivity({
    actorId: user.id,
    type: "MEETING_SCHEDULED",
    description: "Meeting scheduled",
    companyId: input.companyId,
    leadId: input.leadId,
    opportunityId: input.opportunityId,
  });
  revalidateSales();
  return meeting;
}

export async function completeMeeting(meetingId: string, outcome: string, nextAction?: string) {
  const user = await requireUser();
  assertSalesCRMAccess(user);
  const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  assertCanAccessSalesRecord(user, meeting.assignedToId);

  await prisma.meeting.update({ where: { id: meetingId }, data: { completedAt: new Date(), outcome, nextAction } });
  await logSalesActivity({
    actorId: user.id,
    type: "MEETING_COMPLETED",
    description: `Meeting completed: ${outcome}`,
    companyId: meeting.companyId,
    leadId: meeting.leadId,
    opportunityId: meeting.opportunityId,
  });
  revalidateSales();
}

// ---------- Proposals ----------

async function nextProposalNumber(): Promise<string> {
  const year = new Date().getUTCFullYear();
  const count = await prisma.proposal.count();
  return `PRO-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function createProposal(input: {
  companyId: string;
  opportunityId?: string;
  contactPerson?: string;
  items?: string;
  amount: number;
  discount?: number;
  validUntil?: string;
  notes?: string;
  assignedToId?: string;
}) {
  const user = await requireUser();
  assertSalesCRMAccess(user);
  const owner = isOwner(user);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: input.companyId } });
  assertCanAccessSalesRecord(user, company.assignedToId);

  const discount = input.discount ?? 0;
  const finalAmount = Math.max(0, input.amount - discount);

  const proposal = await prisma.proposal.create({
    data: {
      number: await nextProposalNumber(),
      companyId: input.companyId,
      opportunityId: input.opportunityId,
      contactPerson: input.contactPerson,
      items: input.items,
      amount: input.amount,
      discount,
      finalAmount,
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      notes: input.notes,
      assignedToId: resolveOwner(user, owner, input.assignedToId ?? company.assignedToId),
    },
  });
  await logSalesActivity({
    actorId: user.id,
    type: "PROPOSAL_CREATED",
    description: `Proposal ${proposal.number} created`,
    companyId: input.companyId,
    opportunityId: input.opportunityId,
  });
  revalidateSales();
  return proposal;
}

export async function updateProposalStatus(proposalId: string, status: string) {
  const user = await requireUser();
  assertSalesCRMAccess(user);
  const proposal = await prisma.proposal.findUniqueOrThrow({ where: { id: proposalId }, include: { company: true } });
  assertCanAccessSalesRecord(user, proposal.assignedToId);

  await prisma.proposal.update({ where: { id: proposalId }, data: { status: status as never } });
  await logSalesActivity({
    actorId: user.id,
    type: "PROPOSAL_STATUS",
    description: `Proposal ${proposal.number} marked ${status}`,
    companyId: proposal.companyId,
    opportunityId: proposal.opportunityId,
  });

  if (!isOwner(user) || proposal.assignedToId !== user.id) {
    await sendProposalStatusChangeEmail({
      recipientId: proposal.assignedToId,
      proposalId,
      proposalNumber: proposal.number,
      companyName: proposal.company.name,
      status,
    });
  }
  revalidateSales();
}

// ---------- Activities ----------

/** A general activity note not tied to a specific lead/company/opportunity. */
export async function addGeneralActivity(description: string) {
  const user = await requireUser();
  assertSalesCRMAccess(user);
  const trimmed = description.trim();
  if (!trimmed) return;
  await logSalesActivity({ actorId: user.id, type: "NOTE", description: trimmed });
  revalidateSales();
}

// ---------- Sales targets (Owner sets; rep views own) ----------

export async function setSalesTarget(employeeId: string, year: number, month: number, targetAmount: number) {
  const user = await requireUser();
  if (!isOwner(user)) throw new Error("Only the Owner can set sales targets");

  await prisma.salesTarget.upsert({
    where: { employeeId_year_month: { employeeId, year, month } },
    create: { employeeId, year, month, targetAmount },
    update: { targetAmount },
  });
  revalidatePath("/sales/targets");
  revalidatePath("/sales");
}
