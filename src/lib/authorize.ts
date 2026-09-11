import "server-only";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export type SessionUser = { id: string; role: string; name?: string | null; email?: string | null };

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Throws if there is no authenticated session. Use in every server action / data loader. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("Not authenticated");
  return session.user;
}

export function isOwner(user: SessionUser) {
  return user.role === "OWNER";
}
export function isManager(user: SessionUser) {
  return user.role === "MANAGER";
}
export function isDeveloper(user: SessionUser) {
  return user.role === "DEVELOPER";
}

/**
 * OWNER and MANAGER both have company-wide *operational* visibility and
 * management privileges (create/assign projects & tasks, review leave, edit
 * anyone's attendance). ClickfieldAI has exactly one Project Manager who is
 * responsible for the entire workforce, so — unlike a multi-PM org — there is
 * no per-project scoping between managers: MANAGER sees everything OWNER
 * sees data-wise. What OWNER retains exclusively is *administrative* access:
 * employee CRUD, role changes, deactivation. See `assertOwner`.
 */
export function hasCompanyWideView(user: SessionUser) {
  return isOwner(user) || isManager(user);
}
/** Alias kept for readability at call sites that are about managing work, not just viewing it. */
export const canManageAny = hasCompanyWideView;

/** Project ids a user is allowed to see. OWNER/MANAGER: every project. DEVELOPER: projects they're an active member of. */
export async function visibleProjectIds(user: SessionUser): Promise<string[] | "ALL"> {
  if (hasCompanyWideView(user)) return "ALL";

  const assignments = await prisma.projectAssignment.findMany({
    where: { employeeId: user.id, active: true },
    select: { projectId: true },
  });
  return assignments.map((a) => a.projectId);
}

export async function canAccessProject(user: SessionUser, projectId: string): Promise<boolean> {
  const ids = await visibleProjectIds(user);
  return ids === "ALL" || ids.includes(projectId);
}

/** Employee ids a user is allowed to see full profiles / attendance / leave for. OWNER/MANAGER: everyone. DEVELOPER: only themselves. */
export async function visibleEmployeeIds(user: SessionUser): Promise<string[] | "ALL"> {
  if (hasCompanyWideView(user)) return "ALL";
  return [user.id];
}

export async function canAccessEmployee(user: SessionUser, employeeId: string): Promise<boolean> {
  if (employeeId === user.id) return true;
  const ids = await visibleEmployeeIds(user);
  return ids === "ALL" || ids.includes(employeeId);
}

/**
 * A task is visible if its project is visible to the user, or it's assigned
 * to them directly (covers a developer who lost project membership but still
 * has an open task).
 */
export async function canAccessTask(
  user: SessionUser,
  task: { projectId: string; assignedToId: string | null }
): Promise<boolean> {
  if (task.assignedToId === user.id) return true;
  return canAccessProject(user, task.projectId);
}

/** OWNER and MANAGER can both manage any project (single company-wide PM). */
export function canManageProject(user: SessionUser): boolean {
  return hasCompanyWideView(user);
}

export async function assertCanManageProject(user: SessionUser, projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  if (!canManageProject(user)) throw new ForbiddenError("Not permitted to manage this project");
  return project;
}

export async function assertCanAccessEmployee(user: SessionUser, employeeId: string) {
  if (!(await canAccessEmployee(user, employeeId))) throw new ForbiddenError("Not permitted to access this employee");
}

/** Owner-only administrative actions: employee CRUD, role changes, Owner account changes, system settings. */
export async function assertOwner(user: SessionUser) {
  if (!isOwner(user)) throw new ForbiddenError("Owner access required");
}

/** Leave requests: reviewer must be OWNER or MANAGER; a user can always see/manage their own request. */
export function canReviewLeave(user: SessionUser) {
  return hasCompanyWideView(user);
}

export async function canAccessConversation(user: SessionUser, conversationId: string): Promise<boolean> {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_employeeId: { conversationId, employeeId: user.id } },
  });
  return participant !== null;
}

export async function assertCanAccessConversation(user: SessionUser, conversationId: string) {
  if (!(await canAccessConversation(user, conversationId))) throw new ForbiddenError("Not permitted to access this conversation");
}

export async function logActivity(params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.activityLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata as never,
    },
  });
}
