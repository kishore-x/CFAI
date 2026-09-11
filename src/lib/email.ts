import "server-only";
import { Resend } from "resend";
import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Centralized email service. Every outbound email in the app goes through
// sendPreferredEmail() below, which handles: loading the recipient, checking
// they have a usable address, checking their NotificationPreference, and
// swallowing any Resend failure so it can never break the caller's action.
// Individual event emails (sendTaskAssignedEmail, etc.) are thin wrappers
// that just build the subject/body and call it.
// ---------------------------------------------------------------------------

type PreferenceKey =
  | "taskAssigned"
  | "taskCompleted"
  | "taskBlocked"
  | "clarificationRequested"
  | "leaveRequested"
  | "leaveApproved"
  | "leaveRejected"
  | "newMessage"
  | "dailyWorkUpdate"
  | "deadlineReminder";

let resendClient: Resend | null | undefined;

function getResendClient(): Resend | null {
  if (resendClient !== undefined) return resendClient;
  const key = process.env.RESEND_API_KEY;
  resendClient = key ? new Resend(key) : null;
  return resendClient;
}

export function getAppUrl(): string {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  // Local-dev-only convenience — never used as the production fallback.
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return "";
}

function appLink(path: string): string {
  const base = getAppUrl();
  return base ? `${base}${path}` : path;
}

// ---------- shared branded template ----------

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function renderEmailHtml(params: {
  heading: string;
  lines: { label: string; value: string }[];
  bodyText?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const { heading, lines, bodyText, ctaLabel, ctaUrl } = params;
  const rows = lines
    .filter((l) => l.value)
    .map(
      (l) => `
        <tr>
          <td style="padding:6px 0;color:#6b6b6b;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">${escapeHtml(l.label)}</td>
        </tr>
        <tr>
          <td style="padding:0 0 14px;color:#111111;font-size:15px;">${escapeHtml(l.value)}</td>
        </tr>`
    )
    .join("");

  const button =
    ctaLabel && ctaUrl
      ? `<tr><td style="padding:20px 0 0;">
           <a href="${ctaUrl}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:6px;">${escapeHtml(ctaLabel)}</a>
         </td></tr>`
      : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">
            <tr>
              <td style="padding:20px 28px;border-bottom:1px solid #eeeeee;">
                <span style="display:inline-flex;align-items:center;font-weight:700;font-size:14px;color:#111111;">
                  <span style="background:#111111;color:#ffffff;border-radius:6px;padding:2px 7px;margin-right:8px;font-size:12px;">CF</span>
                  ClickfieldAI Hub
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 4px;">
                <h1 style="margin:0 0 12px;font-size:19px;color:#111111;">${escapeHtml(heading)}</h1>
                ${bodyText ? `<p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">${escapeHtml(bodyText)}</p>` : ""}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
                ${button}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;border-top:1px solid #eeeeee;color:#9a9a9a;font-size:11px;">
                ClickfieldAI Hub — internal notification. You can change what you get emailed about in Settings → Notifications.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// ---------- core sender ----------

async function sendPreferredEmail(params: { recipientId: string; prefKey: PreferenceKey; subject: string; html: string }) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: params.recipientId },
      select: { email: true, active: true },
    });
    if (!employee?.email || !employee.active) return;

    const prefs = await prisma.notificationPreference.findUnique({ where: { employeeId: params.recipientId } });
    // No row yet = defaults, which are all ON.
    if (prefs) {
      if (!prefs.emailEnabled) return;
      if (!prefs[params.prefKey]) return;
    }

    const client = getResendClient();
    const from = process.env.EMAIL_FROM;
    if (!client || !from) return; // Not configured — skip quietly, never crash.

    await client.emails.send({
      from,
      to: employee.email,
      subject: params.subject,
      html: params.html,
    });
  } catch (err) {
    // Email must never break the caller's action.
    console.error("[email] send failed:", err);
  }
}

// ---------- event-specific emails ----------

export async function sendTaskAssignedEmail(params: {
  recipientId: string;
  taskId: string;
  taskTitle: string;
  projectName: string;
  priority: string;
  dueDate: Date | null;
  assignedByName: string;
  description?: string | null;
  reassigned?: boolean;
}) {
  await sendPreferredEmail({
    recipientId: params.recipientId,
    prefKey: "taskAssigned",
    subject: params.reassigned ? `Task reassigned to you: ${params.taskTitle}` : `New task assigned: ${params.taskTitle}`,
    html: renderEmailHtml({
      heading: params.reassigned ? "Task reassigned to you" : "New task assigned",
      lines: [
        { label: "Task", value: params.taskTitle },
        { label: "Project", value: params.projectName },
        { label: "Priority", value: params.priority },
        { label: "Deadline", value: params.dueDate ? params.dueDate.toLocaleDateString("en-GB") : "" },
        { label: "Assigned by", value: params.assignedByName },
        { label: "Description", value: params.description ?? "" },
      ],
      ctaLabel: "View Task",
      ctaUrl: appLink(`/tasks/${params.taskId}`),
    }),
  });
}

export async function sendTaskCompletedEmail(params: {
  recipientId: string;
  taskId: string;
  taskTitle: string;
  projectName: string;
  completedByName: string;
  completedAt: Date;
}) {
  await sendPreferredEmail({
    recipientId: params.recipientId,
    prefKey: "taskCompleted",
    subject: `Task completed: ${params.taskTitle}`,
    html: renderEmailHtml({
      heading: "Task completed",
      lines: [
        { label: "Task", value: params.taskTitle },
        { label: "Project", value: params.projectName },
        { label: "Completed by", value: params.completedByName },
        { label: "Completed", value: params.completedAt.toLocaleDateString("en-GB") },
      ],
      ctaLabel: "View Task",
      ctaUrl: appLink(`/tasks/${params.taskId}`),
    }),
  });
}

export async function sendTaskBlockedEmail(params: {
  recipientId: string;
  taskId: string;
  taskTitle: string;
  projectName: string;
  developerName: string;
  reason?: string | null;
}) {
  await sendPreferredEmail({
    recipientId: params.recipientId,
    prefKey: "taskBlocked",
    subject: `Task blocked: ${params.taskTitle}`,
    html: renderEmailHtml({
      heading: "Task blocked",
      lines: [
        { label: "Task", value: params.taskTitle },
        { label: "Project", value: params.projectName },
        { label: "Developer", value: params.developerName },
        { label: "Reason", value: params.reason ?? "" },
      ],
      ctaLabel: "View Task",
      ctaUrl: appLink(`/tasks/${params.taskId}`),
    }),
  });
}

export async function sendClarificationRequestedEmail(params: {
  recipientId: string;
  taskId: string;
  taskTitle: string;
  developerName: string;
  message: string;
}) {
  await sendPreferredEmail({
    recipientId: params.recipientId,
    prefKey: "clarificationRequested",
    subject: `Clarification requested: ${params.taskTitle}`,
    html: renderEmailHtml({
      heading: "Clarification requested",
      lines: [
        { label: "Task", value: params.taskTitle },
        { label: "Developer", value: params.developerName },
        { label: "Request", value: params.message },
      ],
      ctaLabel: "View Task",
      ctaUrl: appLink(`/tasks/${params.taskId}`),
    }),
  });
}

export async function sendLeaveRequestedEmail(params: {
  recipientId: string;
  leaveId: string;
  employeeName: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  reason?: string | null;
}) {
  await sendPreferredEmail({
    recipientId: params.recipientId,
    prefKey: "leaveRequested",
    subject: `Leave request from ${params.employeeName}`,
    html: renderEmailHtml({
      heading: "New leave request",
      lines: [
        { label: "Employee", value: params.employeeName },
        { label: "Leave type", value: params.leaveType },
        { label: "Start date", value: params.startDate.toLocaleDateString("en-GB") },
        { label: "End date", value: params.endDate.toLocaleDateString("en-GB") },
        { label: "Reason", value: params.reason ?? "" },
        { label: "Status", value: "Pending" },
      ],
      ctaLabel: "Review Leave",
      ctaUrl: appLink(`/leave`),
    }),
  });
}

export async function sendLeaveDecisionEmail(params: {
  recipientId: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  status: "APPROVED" | "REJECTED";
  reason?: string | null;
}) {
  const approved = params.status === "APPROVED";
  await sendPreferredEmail({
    recipientId: params.recipientId,
    prefKey: approved ? "leaveApproved" : "leaveRejected",
    subject: approved ? "Your leave request was approved" : "Your leave request was rejected",
    html: renderEmailHtml({
      heading: approved ? "Leave approved" : "Leave rejected",
      lines: [
        { label: "Leave type", value: params.leaveType },
        { label: "Start date", value: params.startDate.toLocaleDateString("en-GB") },
        { label: "End date", value: params.endDate.toLocaleDateString("en-GB") },
        { label: "Status", value: params.status },
        ...(approved ? [] : [{ label: "Reason", value: params.reason ?? "" }]),
      ],
      ctaLabel: "View Leave",
      ctaUrl: appLink(`/leave`),
    }),
  });
}

export async function sendNewMessageEmail(params: {
  recipientId: string;
  conversationId: string;
  senderName: string;
  preview: string;
}) {
  await sendPreferredEmail({
    recipientId: params.recipientId,
    prefKey: "newMessage",
    subject: `New message from ${params.senderName}`,
    html: renderEmailHtml({
      heading: `New message from ${params.senderName}`,
      bodyText: `You have a new message from ${params.senderName}.`,
      lines: [{ label: "Preview", value: params.preview }],
      ctaLabel: "Open Conversation",
      ctaUrl: appLink(`/messages/${params.conversationId}`),
    }),
  });
}

export async function sendDailyWorkUpdateEmail(params: {
  recipientId: string;
  developerName: string;
  date: Date;
  completed?: string | null;
  inProgress?: string | null;
  blocked?: string | null;
  tomorrow?: string | null;
}) {
  await sendPreferredEmail({
    recipientId: params.recipientId,
    prefKey: "dailyWorkUpdate",
    subject: `Daily update from ${params.developerName}`,
    html: renderEmailHtml({
      heading: "Daily work update",
      lines: [
        { label: "Developer", value: params.developerName },
        { label: "Date", value: params.date.toLocaleDateString("en-GB") },
        { label: "Completed today", value: params.completed ?? "" },
        { label: "Working on", value: params.inProgress ?? "" },
        { label: "Blocked by", value: params.blocked ?? "" },
        { label: "Tomorrow's plan", value: params.tomorrow ?? "" },
      ],
      ctaLabel: "View Update",
      ctaUrl: appLink(`/daily-updates`),
    }),
  });
}

export async function sendDeadlineReminderEmail(params: {
  recipientId: string;
  taskId: string;
  taskTitle: string;
  projectName: string;
  dueDate: Date;
  overdue: boolean;
}) {
  await sendPreferredEmail({
    recipientId: params.recipientId,
    prefKey: "deadlineReminder",
    subject: params.overdue ? `Overdue: ${params.taskTitle}` : `Deadline approaching: ${params.taskTitle}`,
    html: renderEmailHtml({
      heading: params.overdue ? "Task overdue" : "Deadline approaching",
      lines: [
        { label: "Task", value: params.taskTitle },
        { label: "Project", value: params.projectName },
        { label: "Due date", value: params.dueDate.toLocaleDateString("en-GB") },
      ],
      ctaLabel: "View Task",
      ctaUrl: appLink(`/tasks/${params.taskId}`),
    }),
  });
}
