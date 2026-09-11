"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { hashPassword, verifyPassword, generateTempPassword } from "@/lib/password";
import {
  requireUser,
  isOwner,
  canManageAny,
  canAccessEmployee,
  canReviewLeave,
  assertCanManageProject,
  assertOwner,
  logActivity,
} from "@/lib/authorize";
import { notify, notifyMany, companyWideRecipientIds } from "@/lib/notify";
import { validateGenericUrl, validateGithubRepoUrl, looksLikeSecret } from "@/lib/validation";
import { sendTaskAssignedEmail, sendTaskCompletedEmail, sendTaskBlockedEmail, sendLeaveRequestedEmail, sendLeaveDecisionEmail } from "@/lib/email";

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

// ---------- Attendance ----------

async function getOrCreateTodayAttendance(employeeId: string) {
  const today = startOfDay(new Date());
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });
  if (existing) return existing;
  return prisma.attendance.create({
    data: { employeeId, date: today, status: "PRESENT", workMode: "OFFICE" },
  });
}

async function assertCanEditAttendance(employeeId: string) {
  const user = await requireUser();
  if (employeeId === user.id) return user;
  if (!(await canAccessEmployee(user, employeeId))) {
    throw new Error("Not permitted to edit this employee's attendance");
  }
  return user;
}

export async function clockIn(employeeId: string, note?: string) {
  const user = await assertCanEditAttendance(employeeId);
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: startOfDay(new Date()) } },
  });
  if (existing?.clockIn) throw new Error("Already checked in today");

  const record = await getOrCreateTodayAttendance(employeeId);
  await prisma.attendance.update({
    where: { id: record.id },
    data: { clockIn: new Date(), status: "PRESENT", note: note || record.note },
  });
  await logActivity({ actorId: user.id, action: "ATTENDANCE_CHECK_IN", entityType: "Employee", entityId: employeeId });
  revalidatePath("/attendance");
  revalidatePath("/");
}

export async function clockOut(employeeId: string, note?: string) {
  const user = await assertCanEditAttendance(employeeId);
  const record = await getOrCreateTodayAttendance(employeeId);
  if (!record.clockIn) throw new Error("Cannot check out before checking in");
  if (record.clockOut) throw new Error("Already checked out today");

  await prisma.attendance.update({
    where: { id: record.id },
    data: { clockOut: new Date(), note: note || record.note },
  });
  await logActivity({ actorId: user.id, action: "ATTENDANCE_CHECK_OUT", entityType: "Employee", entityId: employeeId });
  revalidatePath("/attendance");
  revalidatePath("/");
}

export async function setWorkMode(employeeId: string, workMode: "OFFICE" | "WFH") {
  const user = await assertCanEditAttendance(employeeId);
  const record = await getOrCreateTodayAttendance(employeeId);
  await prisma.attendance.update({ where: { id: record.id }, data: { workMode } });
  await logActivity({
    actorId: user.id,
    action: "ATTENDANCE_WORK_MODE",
    entityType: "Employee",
    entityId: employeeId,
    metadata: { workMode },
  });
  revalidatePath("/attendance");
  revalidatePath("/");
}

export async function setLeave(employeeId: string, onLeave: boolean) {
  await assertCanEditAttendance(employeeId);
  const record = await getOrCreateTodayAttendance(employeeId);
  await prisma.attendance.update({
    where: { id: record.id },
    data: {
      status: onLeave ? "LEAVE" : "PRESENT",
      clockIn: onLeave ? null : record.clockIn,
      clockOut: onLeave ? null : record.clockOut,
    },
  });
  revalidatePath("/attendance");
  revalidatePath("/");
}

// ---------- Projects ----------

const DEV_RESOURCE_STATUSES = ["ACTIVE", "PAUSED", "COMPLETED"];

type DevResourcesInput = {
  githubRepoUrl?: string;
  vercelProjectUrl?: string;
  claudeAccountName?: string;
  productionUrl?: string;
  stagingUrl?: string;
  developmentBranch?: string;
  techStack?: string;
  devResourceStatus?: string;
};

// Shared by createProject and updateProjectDevResources: validates each
// provided field and returns a Prisma-ready data object. Blank strings map
// to null (clears the field) rather than being rejected — every field here
// is optional. Throws on anything actually invalid.
function buildDevResourceData(input: DevResourcesInput) {
  const data: Record<string, string | null> = {};

  if (input.githubRepoUrl !== undefined) {
    const trimmed = input.githubRepoUrl.trim();
    if (!trimmed) data.githubRepoUrl = null;
    else {
      const result = validateGithubRepoUrl(trimmed);
      if (!result.ok) throw new Error(result.error);
      data.githubRepoUrl = result.value;
    }
  }

  if (input.vercelProjectUrl !== undefined) {
    const trimmed = input.vercelProjectUrl.trim();
    if (!trimmed) data.vercelProjectUrl = null;
    else {
      const result = validateGenericUrl(trimmed);
      if (!result.ok) throw new Error(`Vercel URL: ${result.error}`);
      data.vercelProjectUrl = result.value;
    }
  }

  if (input.productionUrl !== undefined) {
    const trimmed = input.productionUrl.trim();
    if (!trimmed) data.productionUrl = null;
    else {
      const result = validateGenericUrl(trimmed);
      if (!result.ok) throw new Error(`Production URL: ${result.error}`);
      data.productionUrl = result.value;
    }
  }

  if (input.stagingUrl !== undefined) {
    const trimmed = input.stagingUrl.trim();
    if (!trimmed) data.stagingUrl = null;
    else {
      const result = validateGenericUrl(trimmed);
      if (!result.ok) throw new Error(`Staging URL: ${result.error}`);
      data.stagingUrl = result.value;
    }
  }

  if (input.claudeAccountName !== undefined) {
    const trimmed = input.claudeAccountName.trim();
    if (trimmed && looksLikeSecret(trimmed)) {
      throw new Error("That looks like a credential or token, not an account name — only store an account/workspace name, never a secret.");
    }
    data.claudeAccountName = trimmed || null;
  }

  if (input.developmentBranch !== undefined) {
    const trimmed = input.developmentBranch.trim();
    if (trimmed && looksLikeSecret(trimmed)) throw new Error("That doesn't look like a branch name.");
    data.developmentBranch = trimmed || null;
  }

  if (input.techStack !== undefined) {
    data.techStack = input.techStack.trim() || null;
  }

  if (input.devResourceStatus !== undefined) {
    const trimmed = input.devResourceStatus.trim();
    if (trimmed && !DEV_RESOURCE_STATUSES.includes(trimmed)) throw new Error("Invalid development status");
    data.devResourceStatus = trimmed || null;
  }

  return data;
}

export async function createProject(
  input: {
    name: string;
    client?: string;
    description?: string;
    deadline?: string;
    managerId?: string;
  } & DevResourcesInput
) {
  const user = await requireUser();
  if (!canManageAny(user)) throw new Error("Only owners and project managers can create projects");

  // A MANAGER creating a project automatically becomes its manager unless
  // an OWNER explicitly assigns someone else.
  const managerId = isOwner(user) ? input.managerId ?? null : user.id;
  const devData = buildDevResourceData(input);

  const project = await prisma.project.create({
    data: {
      name: input.name,
      client: input.client,
      description: input.description,
      deadline: input.deadline ? new Date(input.deadline) : null,
      managerId,
      ...devData,
    },
  });
  await logActivity({ actorId: user.id, action: "PROJECT_CREATED", entityType: "Project", entityId: project.id });
  revalidatePath("/projects");
  revalidatePath("/");
  return project;
}

export async function updateProjectDevResources(projectId: string, input: DevResourcesInput) {
  const user = await requireUser();
  await assertCanManageProject(user, projectId);

  const devData = buildDevResourceData(input);
  await prisma.project.update({ where: { id: projectId }, data: devData });
  await logActivity({ actorId: user.id, action: "PROJECT_DEV_RESOURCES_UPDATED", entityType: "Project", entityId: projectId });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function updateProjectStatus(projectId: string, status: string) {
  const user = await requireUser();
  await assertCanManageProject(user, projectId);
  await prisma.project.update({ where: { id: projectId }, data: { status: status as never } });
  await logActivity({
    actorId: user.id,
    action: "PROJECT_STATUS_CHANGED",
    entityType: "Project",
    entityId: projectId,
    metadata: { status },
  });
  revalidatePath("/projects");
  revalidatePath("/");
}

export async function updateProjectProgressOverride(projectId: string, progress: number | null) {
  const user = await requireUser();
  await assertCanManageProject(user, projectId);
  const clamped = progress === null ? null : Math.max(0, Math.min(100, progress));
  await prisma.project.update({ where: { id: projectId }, data: { progressOverride: clamped } });
  revalidatePath("/projects");
  revalidatePath("/");
}

export async function addProjectMember(projectId: string, employeeId: string, role: string) {
  const user = await requireUser();
  await assertCanManageProject(user, projectId);

  await prisma.projectAssignment.upsert({
    where: { projectId_employeeId: { projectId, employeeId } },
    create: { projectId, employeeId, role: role as never, active: true },
    update: { active: true, removedAt: null, role: role as never },
  });
  await logActivity({
    actorId: user.id,
    action: "PROJECT_MEMBER_ADDED",
    entityType: "Project",
    entityId: projectId,
    metadata: { employeeId, role },
  });
  if (employeeId !== user.id) {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
    await notify(employeeId, "PROJECT_UPDATE", `You were added to project: ${project?.name ?? "a project"}`, { type: "Project", id: projectId });
  }
  revalidatePath("/projects");
  revalidatePath("/employees");
  revalidatePath("/");
}

export async function removeProjectMember(projectId: string, employeeId: string) {
  const user = await requireUser();
  await assertCanManageProject(user, projectId);

  await prisma.projectAssignment.update({
    where: { projectId_employeeId: { projectId, employeeId } },
    data: { active: false, removedAt: new Date() },
  });
  await logActivity({
    actorId: user.id,
    action: "PROJECT_MEMBER_REMOVED",
    entityType: "Project",
    entityId: projectId,
    metadata: { employeeId },
  });
  revalidatePath("/projects");
  revalidatePath("/employees");
  revalidatePath("/");
}

// ---------- Tasks ----------

export async function createTask(input: {
  projectId: string;
  title: string;
  description?: string;
  priority?: string;
  assignedToId?: string;
  dueDate?: string;
}) {
  const user = await requireUser();
  await assertCanManageProject(user, input.projectId);

  const task = await prisma.task.create({
    data: {
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      priority: (input.priority as never) ?? "MEDIUM",
      assignedToId: input.assignedToId,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      createdById: user.id,
    },
  });
  await logActivity({
    actorId: user.id,
    action: "TASK_CREATED",
    entityType: "Task",
    entityId: task.id,
    metadata: { projectId: input.projectId, assignedToId: input.assignedToId },
  });
  if (input.assignedToId && input.assignedToId !== user.id) {
    await notify(input.assignedToId, "TASK_ASSIGNED", `New task assigned: ${input.title}`, { type: "Task", id: task.id });
    const project = await prisma.project.findUnique({ where: { id: input.projectId }, select: { name: true } });
    await sendTaskAssignedEmail({
      recipientId: input.assignedToId,
      taskId: task.id,
      taskTitle: task.title,
      projectName: project?.name ?? "",
      priority: task.priority,
      dueDate: task.dueDate,
      assignedByName: user.name ?? "Someone",
      description: task.description,
    });
  }
  revalidatePath("/projects");
  revalidatePath("/tasks");
  revalidatePath("/");
  return task;
}

async function assertCanEditTask(taskId: string) {
  const user = await requireUser();
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  if (task.assignedToId === user.id) return { user, task };
  await assertCanManageProject(user, task.projectId);
  return { user, task };
}

export async function updateTaskStatus(taskId: string, status: string) {
  const { user, task } = await assertCanEditTask(taskId);
  await prisma.task.update({
    where: { id: taskId },
    data: { status: status as never, completedAt: status === "COMPLETED" ? new Date() : null },
  });
  await logActivity({
    actorId: user.id,
    action: "TASK_STATUS_CHANGED",
    entityType: "Task",
    entityId: taskId,
    metadata: { status, projectId: task.projectId },
  });
  if (status === "BLOCKED" || status === "COMPLETED") {
    const recipients = await companyWideRecipientIds(user.id);
    await notifyMany(
      recipients,
      status === "BLOCKED" ? "TASK_BLOCKED" : "TASK_COMPLETED",
      `${task.title} was marked ${status === "BLOCKED" ? "blocked" : "completed"} by ${user.name ?? "a developer"}`,
      { type: "Task", id: taskId }
    );
    const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { name: true } });
    await Promise.all(
      recipients.map((id) =>
        status === "BLOCKED"
          ? sendTaskBlockedEmail({
              recipientId: id,
              taskId,
              taskTitle: task.title,
              projectName: project?.name ?? "",
              developerName: user.name ?? "A developer",
            })
          : sendTaskCompletedEmail({
              recipientId: id,
              taskId,
              taskTitle: task.title,
              projectName: project?.name ?? "",
              completedByName: user.name ?? "A developer",
              completedAt: new Date(),
            })
      )
    );
  }
  revalidatePath("/projects");
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function reassignTask(taskId: string, assignedToId: string | null, priority?: string, dueDate?: string | null) {
  const user = await requireUser();
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  await assertCanManageProject(user, task.projectId);

  await prisma.task.update({
    where: { id: taskId },
    data: {
      assignedToId,
      ...(priority ? { priority: priority as never } : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
    },
  });
  await logActivity({
    actorId: user.id,
    action: "TASK_ASSIGNED",
    entityType: "Task",
    entityId: taskId,
    metadata: { assignedToId, projectId: task.projectId },
  });
  if (assignedToId && assignedToId !== task.assignedToId) {
    await notify(assignedToId, "TASK_REASSIGNED", `Task reassigned to you: ${task.title}`, { type: "Task", id: taskId });
    const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { name: true } });
    await sendTaskAssignedEmail({
      recipientId: assignedToId,
      taskId,
      taskTitle: task.title,
      projectName: project?.name ?? "",
      priority: priority ?? task.priority,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : task.dueDate,
      assignedByName: user.name ?? "Someone",
      description: task.description,
      reassigned: true,
    });
  }
  revalidatePath("/projects");
  revalidatePath("/tasks");
  revalidatePath("/");
}

// ---------- Leave ----------

export async function submitLeaveRequest(input: { type: string; startDate: string; endDate: string; reason?: string }) {
  const user = await requireUser();
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  if (end < start) throw new Error("End date cannot be before start date");

  const leave = await prisma.leaveRequest.create({
    data: {
      employeeId: user.id,
      type: input.type,
      startDate: start,
      endDate: end,
      reason: input.reason,
      status: "PENDING",
    },
  });
  await logActivity({ actorId: user.id, action: "LEAVE_REQUESTED", entityType: "LeaveRequest", entityId: leave.id });
  const reviewers = await companyWideRecipientIds(user.id);
  await notifyMany(reviewers, "LEAVE_REQUESTED", `${user.name ?? "An employee"} requested ${input.type} leave`, { type: "LeaveRequest", id: leave.id });
  await Promise.all(
    reviewers.map((id) =>
      sendLeaveRequestedEmail({
        recipientId: id,
        leaveId: leave.id,
        employeeName: user.name ?? "An employee",
        leaveType: input.type,
        startDate: start,
        endDate: end,
        reason: input.reason,
      })
    )
  );
  revalidatePath("/leave");
  return leave;
}

export async function reviewLeaveRequest(leaveId: string, status: "APPROVED" | "REJECTED") {
  const user = await requireUser();
  if (!canReviewLeave(user)) throw new Error("Only owners and the project manager can review leave requests");

  const leave = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { status, reviewedById: user.id, reviewedAt: new Date() },
  });
  await logActivity({
    actorId: user.id,
    action: status === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
    entityType: "LeaveRequest",
    entityId: leaveId,
    metadata: { employeeId: leave.employeeId },
  });
  await notify(
    leave.employeeId,
    status === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
    `Your ${leave.type} leave request was ${status.toLowerCase()}`,
    { type: "LeaveRequest", id: leaveId }
  );
  await sendLeaveDecisionEmail({
    recipientId: leave.employeeId,
    leaveType: leave.type,
    startDate: leave.startDate,
    endDate: leave.endDate,
    status,
  });
  revalidatePath("/leave");
  revalidatePath("/attendance");
  revalidatePath("/");
}

// ---------- Notifications ----------

export async function markNotificationRead(notificationId: string) {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { id: notificationId, recipientId: user.id },
    data: { read: true },
  });
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { recipientId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/notifications");
}

// ---------- Employee management (OWNER only) ----------

export async function createEmployee(input: {
  name: string;
  email: string;
  title?: string;
  department?: string;
  role: string;
}) {
  const user = await requireUser();
  await assertOwner(user);

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const employee = await prisma.employee.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase().trim(),
      title: input.title,
      department: input.department,
      role: input.role as never,
      passwordHash,
      mustChangePassword: true,
    },
  });
  await logActivity({ actorId: user.id, action: "EMPLOYEE_CREATED", entityType: "Employee", entityId: employee.id });
  revalidatePath("/employees");
  revalidatePath("/");
  return { employee, tempPassword };
}

export async function updateEmployeeRole(employeeId: string, role: string) {
  const user = await requireUser();
  await assertOwner(user);
  await prisma.employee.update({ where: { id: employeeId }, data: { role: role as never } });
  await logActivity({
    actorId: user.id,
    action: "EMPLOYEE_ROLE_CHANGED",
    entityType: "Employee",
    entityId: employeeId,
    metadata: { role },
  });
  revalidatePath("/employees");
}

export async function setEmployeeActive(employeeId: string, active: boolean) {
  const user = await requireUser();
  await assertOwner(user);
  await prisma.employee.update({ where: { id: employeeId }, data: { active } });
  await logActivity({
    actorId: user.id,
    action: active ? "EMPLOYEE_REACTIVATED" : "EMPLOYEE_DEACTIVATED",
    entityType: "Employee",
    entityId: employeeId,
  });
  revalidatePath("/employees");
}

// ---------- Account ----------

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ error: string } | { error: null }> {
  const user = await requireUser();
  const employee = await prisma.employee.findUniqueOrThrow({ where: { id: user.id } });

  const valid = await verifyPassword(currentPassword, employee.passwordHash);
  if (!valid) return { error: "Current password is incorrect" };
  if (newPassword.length < 8) return { error: "New password must be at least 8 characters" };

  const passwordHash = await hashPassword(newPassword);
  await prisma.employee.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });
  return { error: null };
}
