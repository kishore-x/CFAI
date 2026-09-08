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
/** OWNER and MANAGER both have management privileges (scoped for MANAGER). */
export function canManageAny(user: SessionUser) {
  return isOwner(user) || isManager(user);
}

/**
 * Project ids a user is allowed to see.
 * OWNER: every project. MANAGER: projects they manage or are an active member
 * of. DEVELOPER: projects they are an active member of.
 */
export async function visibleProjectIds(user: SessionUser): Promise<string[] | "ALL"> {
  if (isOwner(user)) return "ALL";

  if (isManager(user)) {
    const projects = await prisma.project.findMany({
      where: {
        OR: [{ managerId: user.id }, { assignments: { some: { employeeId: user.id, active: true } } }],
      },
      select: { id: true },
    });
    return projects.map((p) => p.id);
  }

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

/**
 * Employee ids a user is allowed to see full profiles / attendance for.
 * OWNER: everyone. MANAGER: themselves + every active member of a project
 * they manage or belong to. DEVELOPER: only themselves.
 */
export async function visibleEmployeeIds(user: SessionUser): Promise<string[] | "ALL"> {
  if (isOwner(user)) return "ALL";

  if (isManager(user)) {
    const projectIds = await visibleProjectIds(user);
    if (projectIds === "ALL") return "ALL";
    if (projectIds.length === 0) return [user.id];

    const members = await prisma.projectAssignment.findMany({
      where: { projectId: { in: projectIds }, active: true },
      select: { employeeId: true },
    });
    return Array.from(new Set([user.id, ...members.map((m) => m.employeeId)]));
  }

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
 * has an open task, matching the spec's OR clause).
 */
export async function canAccessTask(
  user: SessionUser,
  task: { projectId: string; assignedToId: string | null }
): Promise<boolean> {
  if (task.assignedToId === user.id) return true;
  return canAccessProject(user, task.projectId);
}

/** Only OWNER, or the MANAGER who manages this specific project. */
export function canManageProject(
  user: SessionUser,
  project: { managerId: string | null }
): boolean {
  if (isOwner(user)) return true;
  return isManager(user) && project.managerId === user.id;
}

export async function assertCanManageProject(user: SessionUser, projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  if (!canManageProject(user, project)) throw new ForbiddenError("Not permitted to manage this project");
  return project;
}

export async function assertCanAccessEmployee(user: SessionUser, employeeId: string) {
  if (!(await canAccessEmployee(user, employeeId))) throw new ForbiddenError("Not permitted to access this employee");
}

export async function assertOwner(user: SessionUser) {
  if (!isOwner(user)) throw new ForbiddenError("Owner access required");
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
