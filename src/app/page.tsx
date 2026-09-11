export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, StatCard, ProjectStatusBadge, AttendanceBadge, TaskStatusBadge, Avatar, fmtTime } from "@/lib/ui";
import { requireUser, isOwner, hasCompanyWideView } from "@/lib/authorize";
import { AssignTaskForm } from "@/app/tasks/assign-task-form";
import { DailyUpdateForm } from "@/app/daily-updates/daily-update-form";
import { getDeveloperWorkload } from "@/lib/services";
import { HScrollContainer } from "@/app/h-scroll-container";

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

function taskCounts(tasks: { status: string; dueDate: Date | null }[]) {
  const now = new Date();
  return {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "COMPLETED").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    inReview: tasks.filter((t) => t.status === "IN_REVIEW").length,
    blocked: tasks.filter((t) => t.status === "BLOCKED").length,
    todo: tasks.filter((t) => t.status === "TODO").length,
    overdue: tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "COMPLETED").length,
  };
}

function projectProgress(p: { progressOverride: number | null; tasks: { status: string }[] }) {
  if (p.progressOverride !== null) return p.progressOverride;
  if (p.tasks.length === 0) return 0;
  return Math.round((p.tasks.filter((t) => t.status === "COMPLETED").length / p.tasks.length) * 100);
}

export default async function OverviewPage() {
  const user = await requireUser();
  const today = startOfDay(new Date());

  if (hasCompanyWideView(user)) return <CompanyDashboard user={user} today={today} />;
  return <DeveloperDashboard user={user} today={today} />;
}

// ---------------- OWNER + MANAGER (company-wide operational view) ----------------

async function CompanyDashboard({ user, today }: { user: { id: string; role: string }; today: Date }) {
  const owner = isOwner(user);

  const [employees, todaysAttendance, projects, allTasks, pendingLeaveRequests, attendanceConfig, activity] = await Promise.all([
    prisma.employee.findMany({ where: { active: true } }),
    prisma.attendance.findMany({ where: { date: today }, include: { employee: true } }),
    prisma.project.findMany({ include: { tasks: true, assignments: { where: { active: true }, include: { employee: true } } }, orderBy: { updatedAt: "desc" } }),
    prisma.task.findMany({ include: { assignedTo: true, project: true } }),
    prisma.leaveRequest.findMany({ where: { status: "PENDING" }, include: { employee: true } }),
    prisma.attendanceConfig.findUnique({ where: { id: "singleton" } }),
    owner ? prisma.activityLog.findMany({ include: { actor: true }, orderBy: { createdAt: "desc" }, take: 10 }) : Promise.resolve([]),
  ]);
  const pendingLeave = pendingLeaveRequests.length;

  const present = todaysAttendance.filter((a) => a.status === "PRESENT");
  const wfh = present.filter((a) => a.workMode === "WFH").length;
  const office = present.filter((a) => a.workMode === "OFFICE").length;
  const onLeave = todaysAttendance.filter((a) => a.status === "LEAVE").length;
  const absent = Math.max(employees.length - present.length - onLeave, 0);

  const tCounts = taskCounts(allTasks);
  const activeProjects = projects.filter((p) => p.status === "ACTIVE" || p.status === "PLANNING").length;
  const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;
  const onHoldProjects = projects.filter((p) => p.status === "ON_HOLD").length;

  const developers = employees.filter((e) => e.role === "DEVELOPER");
  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));
  const employeeOptions = employees.map((e) => ({ id: e.id, name: e.name }));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Dashboard" />
        <AssignTaskForm projects={projectOptions} employees={employeeOptions} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label={owner ? "Total employees" : "Total developers"} value={owner ? employees.length : developers.length} />
        <StatCard label="Present today" value={present.length} hint={`${office} office · ${wfh} WFH`} />
        <StatCard label="On leave" value={onLeave} />
        <StatCard label="Absent today" value={absent} />
        <StatCard label="Pending leave requests" value={pendingLeave} />
      </div>

      {owner && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Active projects" value={activeProjects} hint={`${projects.length} total`} />
          <StatCard label="Projects on hold" value={onHoldProjects} />
          <StatCard label="Projects completed" value={completedProjects} />
          <StatCard label="Tasks overdue" value={tCounts.overdue} />
        </div>
      )}

      <NeedsAttention tasks={allTasks} pendingLeaveRequests={pendingLeaveRequests} projects={projects} />

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5 overflow-hidden">
          <h2 className="font-semibold mb-4">Developer progress</h2>
          <DeveloperProgressTable developers={developers.length > 0 ? developers : employees} tasks={allTasks} />
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-4">Team workload</h2>
          <TeamWorkload developers={developers.length > 0 ? developers : employees} tasks={allTasks} />
        </Card>
      </div>

      <AttendanceIssues employees={employees} todaysAttendance={todaysAttendance} config={attendanceConfig} />

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Today&apos;s attendance</h2>
            <Link href="/attendance" className="text-sm text-[var(--accent)] font-medium hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-3">
            {employees.map((e) => {
              const a = todaysAttendance.find((x) => x.employeeId === e.id);
              return (
                <li key={e.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={e.name} />
                    <div className="min-w-0">
                      <Link href={`/employees/${e.id}`} className="text-sm font-medium truncate hover:underline block">
                        {e.name}
                      </Link>
                      <div className="text-xs text-[var(--muted)] truncate">{e.title}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a?.status === "PRESENT" && <span className="text-xs text-[var(--muted)]">{a.workMode === "WFH" ? "WFH" : "Office"} · {fmtTime(a.clockIn)}</span>}
                    <AttendanceBadge status={a?.status ?? "LEAVE"} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Projects</h2>
            <Link href="/projects" className="text-sm text-[var(--accent)] font-medium hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-4">
            {projects.map((p) => (
              <ProjectProgressRow key={p.id} p={p} />
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Team task status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
          <TaskStatTile label="Completed" value={tCounts.completed} />
          <TaskStatTile label="In progress" value={tCounts.inProgress} />
          <TaskStatTile label="In review" value={tCounts.inReview} />
          <TaskStatTile label="Blocked" value={tCounts.blocked} />
          <TaskStatTile label="Todo" value={tCounts.todo} />
        </div>
        <div className="mt-2 text-xs text-[var(--muted)]">Total tasks: {tCounts.total}</div>
      </Card>

      {owner && (
        <Card className="p-5">
          <h2 className="font-semibold mb-4">Recent activity</h2>
          <ActivityFeed activity={activity} />
        </Card>
      )}
    </div>
  );
}

// ---------------- DEVELOPER ----------------

async function DeveloperDashboard({ user, today }: { user: { id: string; role: string; name?: string | null }; today: Date }) {
  const [employee, attendance, tasks, assignments, todayUpdate] = await Promise.all([
    prisma.employee.findUniqueOrThrow({ where: { id: user.id } }),
    prisma.attendance.findUnique({ where: { employeeId_date: { employeeId: user.id, date: today } } }),
    prisma.task.findMany({
      where: { assignedToId: user.id },
      include: { project: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.projectAssignment.findMany({
      where: { employeeId: user.id, active: true },
      include: { project: { include: { tasks: true } } },
    }),
    prisma.dailyWorkUpdate.findUnique({ where: { employeeId_date: { employeeId: user.id, date: today } } }),
  ]);

  const now = new Date();
  const pending = tasks.filter((t) => t.status !== "COMPLETED");
  const completed = tasks.filter((t) => t.status === "COMPLETED");
  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "COMPLETED");
  const firstName = employee.name.split(" ")[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Good {greeting()}, {firstName}</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {today.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Today</h2>
        {attendance?.clockIn ? (
          <div className="text-sm space-y-1">
            <div>● Checked in at {fmtTime(attendance.clockIn)}</div>
            <div>● Working from {attendance.workMode === "WFH" ? "home" : "office"}</div>
            {attendance.clockOut && <div>● Checked out at {fmtTime(attendance.clockOut)}</div>}
          </div>
        ) : (
          <div className="text-sm text-[var(--muted)]">
            You haven&apos;t checked in yet.{" "}
            <Link href="/attendance" className="text-[var(--accent)] hover:underline">
              Check in now
            </Link>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Pending tasks" value={pending.length} />
        <StatCard label="Completed" value={completed.length} />
        <StatCard label="Overdue" value={overdue.length} />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">My projects</h2>
          <Link href="/projects" className="text-sm text-[var(--accent)] font-medium hover:underline">
            View all
          </Link>
        </div>
        <ul className="space-y-4">
          {assignments.map((a) => (
            <ProjectProgressRow key={a.project.id} p={a.project} />
          ))}
          {assignments.length === 0 && <div className="text-sm text-[var(--muted)]">No projects assigned yet.</div>}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">My tasks</h2>
        <ul className="space-y-1.5">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-sm py-1">
              <span className="flex-1 min-w-0 truncate">{t.title}</span>
              <span className="text-xs text-[var(--muted)]">{t.project.name}</span>
              <TaskStatusBadge status={t.status} />
            </li>
          ))}
          {tasks.length === 0 && <li className="text-sm text-[var(--muted)]">No tasks assigned yet.</li>}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">My daily update</h2>
        <DailyUpdateForm initial={todayUpdate ? { completed: todayUpdate.completed, inProgress: todayUpdate.inProgress, blocked: todayUpdate.blocked, tomorrow: todayUpdate.tomorrow } : undefined} />
      </Card>
    </div>
  );
}

// ---------------- shared bits ----------------

function PageHeader({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-[var(--muted)] mt-1">
        {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>
  );
}

function TaskStatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white/5 px-3 py-2">
      <div className="text-[var(--muted)] text-xs">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

type AttentionTask = {
  id: string;
  title: string;
  status: string;
  dueDate: Date | null;
  assignedTo: { name: string } | null;
  project: { id: string; name: string };
};

function NeedsAttention({
  tasks,
  pendingLeaveRequests,
  projects,
}: {
  tasks: AttentionTask[];
  pendingLeaveRequests: { id: string; employee: { name: string }; type: string }[];
  projects: { id: string; name: string; deadline: Date | null; status: string }[];
}) {
  const startOfToday = startOfDay(new Date());

  const taskItems = tasks
    .filter((t) => t.status !== "COMPLETED")
    .map((t) => {
      if (t.dueDate && new Date(t.dueDate) < startOfToday) {
        const days = Math.floor((startOfToday.getTime() - new Date(t.dueDate).getTime()) / 86400000);
        return { key: `task-${t.id}`, href: `/tasks/${t.id}`, dot: "🔴", label: t.title, sub: t.assignedTo?.name ?? "Unassigned", note: `${days} day${days > 1 ? "s" : ""} overdue`, weight: 4 };
      }
      if (t.status === "BLOCKED") return { key: `task-${t.id}`, href: `/tasks/${t.id}`, dot: "🟠", label: t.title, sub: t.assignedTo?.name ?? "Unassigned", note: "Blocked", weight: 3 };
      if (t.status === "IN_REVIEW") return { key: `task-${t.id}`, href: `/tasks/${t.id}`, dot: "🟣", label: t.title, sub: t.assignedTo?.name ?? "Unassigned", note: "Awaiting review", weight: 2 };
      if (t.dueDate && startOfDay(new Date(t.dueDate)).getTime() === startOfToday.getTime()) {
        return { key: `task-${t.id}`, href: `/tasks/${t.id}`, dot: "🟡", label: t.title, sub: t.assignedTo?.name ?? "Unassigned", note: "Due today", weight: 1 };
      }
      return null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const leaveItems = pendingLeaveRequests.map((l) => ({
    key: `leave-${l.id}`,
    href: "/leave",
    dot: "🟣",
    label: `${l.employee.name} — ${l.type} leave`,
    sub: "",
    note: "Pending approval",
    weight: 3,
  }));

  const nowMs = startOfToday.getTime();
  const deadlineItems = projects
    .filter((p) => p.deadline && p.status !== "COMPLETED" && p.status !== "CANCELLED")
    .map((p) => {
      const days = Math.ceil((new Date(p.deadline!).getTime() - nowMs) / 86400000);
      if (days < 0) return { key: `proj-${p.id}`, href: `/projects/${p.id}`, dot: "🔴", label: p.name, sub: "", note: "Project overdue", weight: 4 };
      if (days <= 7) return { key: `proj-${p.id}`, href: `/projects/${p.id}`, dot: "⚠️", label: p.name, sub: "", note: `${days}d to deadline`, weight: 2 };
      return null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const items = [...taskItems, ...leaveItems, ...deadlineItems].sort((a, b) => b.weight - a.weight).slice(0, 8);

  if (items.length === 0) return null;

  return (
    <Card className="p-5">
      <h2 className="font-semibold mb-3">Needs attention</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span>{item.dot}</span>
              <Link href={item.href} className="truncate hover:underline">
                {item.label}
              </Link>
              {item.sub && <span className="text-[var(--muted)] text-xs shrink-0">{item.sub}</span>}
            </span>
            <span className="text-xs text-[var(--muted)] shrink-0">{item.note}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TeamWorkload({ developers, tasks }: { developers: { id: string; name: string }[]; tasks: { assignedToId: string | null; status: string; priority: string }[] }) {
  const WORKLOAD_STYLE: Record<string, string> = {
    LOW: "border border-[var(--border)] text-[var(--muted)]",
    NORMAL: "border border-white/40 text-[var(--foreground)]",
    HIGH: "bg-gray-400 text-black",
    OVERLOADED: "bg-white text-black",
  };
  return (
    <ul className="space-y-2">
      {developers.map((d) => {
        const mine = tasks.filter((t) => t.assignedToId === d.id);
        const { activeCount, level } = getDeveloperWorkload(mine);
        return (
          <li key={d.id} className="grid grid-cols-[1fr_5rem_6rem] items-center gap-3 text-sm">
            <Link href={`/employees/${d.id}`} className="hover:underline truncate">
              {d.name}
            </Link>
            <span className="text-xs text-[var(--muted)] text-right whitespace-nowrap">{activeCount} active</span>
            <span className={`text-[11px] py-0.5 rounded-full font-medium text-center min-w-[92px] inline-block ${WORKLOAD_STYLE[level]}`}>{level}</span>
          </li>
        );
      })}
      {developers.length === 0 && <li className="text-sm text-[var(--muted)]">No developers yet.</li>}
    </ul>
  );
}

function AttendanceIssues({
  employees,
  todaysAttendance,
  config,
}: {
  employees: { id: string; name: string }[];
  todaysAttendance: { employeeId: string; status: string; clockIn: Date | null; clockOut: Date | null }[];
  config: { officeStartTime: string; graceMinutes: number } | null;
}) {
  const officeStart = config?.officeStartTime ?? "09:30";
  const grace = config?.graceMinutes ?? 15;
  const [h, m] = officeStart.split(":").map(Number);
  const thresholdMinutes = h * 60 + m + grace;

  const issues: { key: string; label: string; note: string }[] = [];
  for (const e of employees) {
    const a = todaysAttendance.find((x) => x.employeeId === e.id);
    if (!a) continue;
    if (a.status === "PRESENT" && a.clockIn) {
      const inMinutes = a.clockIn.getUTCHours() * 60 + a.clockIn.getUTCMinutes();
      if (inMinutes > thresholdMinutes) {
        issues.push({ key: `late-${e.id}`, label: e.name, note: `Late check-in — ${a.clockIn.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` });
      }
    }
    if (a.status === "PRESENT" && a.clockIn && !a.clockOut) {
      issues.push({ key: `nocheckout-${e.id}`, label: e.name, note: "Missing checkout" });
    }
    if (a.status !== "PRESENT" && a.status !== "LEAVE") {
      issues.push({ key: `absent-${e.id}`, label: e.name, note: "Absent" });
    }
  }
  const noRecord = employees.filter((e) => !todaysAttendance.some((a) => a.employeeId === e.id));

  if (issues.length === 0 && noRecord.length === 0) return null;

  return (
    <Card className="p-5">
      <h2 className="font-semibold mb-3">Attendance issues</h2>
      <ul className="space-y-1.5 text-sm">
        {issues.map((i) => (
          <li key={i.key} className="flex items-center justify-between">
            <span>{i.label}</span>
            <span className="text-xs text-[var(--muted)]">{i.note}</span>
          </li>
        ))}
        {noRecord.map((e) => (
          <li key={`norecord-${e.id}`} className="flex items-center justify-between">
            <span>{e.name}</span>
            <span className="text-xs text-[var(--muted)]">No attendance recorded</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DeveloperProgressTable({
  developers,
  tasks,
}: {
  developers: { id: string; name: string }[];
  tasks: { assignedToId: string | null; status: string }[];
}) {
  return (
    <HScrollContainer className="overflow-x-auto scrollbar-hide">
      <table className="w-full text-left border-separate border-spacing-0">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
            <th className="py-2 pr-3 font-medium whitespace-nowrap">Developer</th>
            <th className="py-2 pr-3 font-medium whitespace-nowrap text-right">Assigned</th>
            <th className="py-2 pr-3 font-medium whitespace-nowrap text-right">Completed</th>
            <th className="py-2 pr-3 font-medium whitespace-nowrap text-right">In Progress</th>
            <th className="py-2 pr-3 font-medium whitespace-nowrap text-right">Blocked</th>
            <th className="py-2 pr-3 font-medium whitespace-nowrap">Progress</th>
          </tr>
        </thead>
        <tbody>
          {developers.map((d) => {
            const mine = tasks.filter((t) => t.assignedToId === d.id);
            const completed = mine.filter((t) => t.status === "COMPLETED").length;
            const inProgress = mine.filter((t) => t.status === "IN_PROGRESS").length;
            const blocked = mine.filter((t) => t.status === "BLOCKED").length;
            const progress = mine.length > 0 ? Math.round((completed / mine.length) * 100) : 0;
            return (
              <tr key={d.id} className="border-t border-[var(--border)]">
                <td className="py-2.5 pr-3 text-sm truncate">
                  <Link href={`/employees/${d.id}`} className="hover:underline">
                    {d.name}
                  </Link>
                </td>
                <td className="py-2.5 pr-3 text-sm text-right">{mine.length}</td>
                <td className="py-2.5 pr-3 text-sm text-right">{completed}</td>
                <td className="py-2.5 pr-3 text-sm text-right">{inProgress}</td>
                <td className="py-2.5 pr-3 text-sm text-right">{blocked}</td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2 w-24">
                    <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-xs text-[var(--muted)] w-9 text-right">{progress}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
          {developers.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-center text-sm text-[var(--muted)]">
                No developers yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </HScrollContainer>
  );
}

function ProjectProgressRow({
  p,
  showTaskCount,
}: {
  p: { id: string; name: string; status: string; progressOverride: number | null; tasks: { status: string }[]; assignments?: unknown[] };
  showTaskCount?: boolean;
}) {
  const progress = projectProgress(p);
  const done = p.tasks.filter((t) => t.status === "COMPLETED").length;
  return (
    <li>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-medium truncate">{p.name}</span>
        <ProjectStatusBadge status={p.status} />
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-[var(--muted)]">
        <span>
          {p.assignments && `${p.assignments.length} on team · `}
          {showTaskCount !== false && `${done}/${p.tasks.length} tasks done`}
        </span>
        <span>{progress}%</span>
      </div>
    </li>
  );
}

const ACTION_LABEL: Record<string, string> = {
  EMPLOYEE_CREATED: "created employee",
  EMPLOYEE_ROLE_CHANGED: "changed role for",
  EMPLOYEE_DEACTIVATED: "deactivated",
  EMPLOYEE_REACTIVATED: "reactivated",
  PROJECT_CREATED: "created project",
  PROJECT_STATUS_CHANGED: "changed status of",
  PROJECT_MEMBER_ADDED: "added a member to",
  PROJECT_MEMBER_REMOVED: "removed a member from",
  TASK_CREATED: "created a task in",
  TASK_ASSIGNED: "reassigned a task in",
  TASK_STATUS_CHANGED: "updated a task in",
  ATTENDANCE_CHECK_IN: "checked in",
  ATTENDANCE_CHECK_OUT: "checked out",
  ATTENDANCE_WORK_MODE: "updated work mode",
  LEAVE_REQUESTED: "requested leave",
  LEAVE_APPROVED: "approved leave for",
  LEAVE_REJECTED: "rejected leave for",
};

function ActivityFeed({ activity }: { activity: { id: string; action: string; createdAt: Date; actor: { name: string } }[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {activity.map((a) => (
        <li key={a.id} className="flex items-center justify-between text-[var(--muted)]">
          <span>
            <span className="text-[var(--foreground)]">{a.actor.name}</span> {ACTION_LABEL[a.action] ?? a.action.toLowerCase().replace(/_/g, " ")}
          </span>
          <span className="text-xs">{new Date(a.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
        </li>
      ))}
      {activity.length === 0 && <li className="text-[var(--muted)]">No activity yet.</li>}
    </ul>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
