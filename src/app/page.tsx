export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, StatCard, ProjectStatusBadge, AttendanceBadge, TaskStatusBadge, Avatar, fmtTime } from "@/lib/ui";
import { requireUser, isOwner, isManager, visibleProjectIds, visibleEmployeeIds } from "@/lib/authorize";

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
    blocked: tasks.filter((t) => t.status === "BLOCKED").length,
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

  if (isOwner(user)) return <OwnerDashboard today={today} />;
  if (isManager(user)) return <ManagerDashboard user={user} today={today} />;
  return <DeveloperDashboard user={user} today={today} />;
}

// ---------------- OWNER ----------------

async function OwnerDashboard({ today }: { today: Date }) {
  const [employees, todaysAttendance, projects, activity] = await Promise.all([
    prisma.employee.findMany({ where: { active: true } }),
    prisma.attendance.findMany({ where: { date: today }, include: { employee: true } }),
    prisma.project.findMany({ include: { tasks: true, assignments: true }, orderBy: { updatedAt: "desc" } }),
    prisma.activityLog.findMany({ include: { actor: true }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const present = todaysAttendance.filter((a) => a.status === "PRESENT");
  const wfh = present.filter((a) => a.workMode === "WFH").length;
  const office = present.filter((a) => a.workMode === "OFFICE").length;
  const absent = employees.length - present.length;

  const allTasks = projects.flatMap((p) => p.tasks);
  const tCounts = taskCounts(allTasks);
  const activeProjects = projects.filter((p) => p.status === "ACTIVE" || p.status === "PLANNING").length;
  const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;
  const onHoldProjects = projects.filter((p) => p.status === "ON_HOLD").length;

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total employees" value={employees.length} />
        <StatCard label="Present today" value={present.length} hint={`${office} office · ${wfh} WFH`} />
        <StatCard label="Absent today" value={absent} />
        <StatCard label="Active projects" value={activeProjects} hint={`${projects.length} total`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Projects on hold" value={onHoldProjects} />
        <StatCard label="Projects completed" value={completedProjects} />
        <StatCard label="Tasks overdue" value={tCounts.overdue} />
        <StatCard label="Tasks blocked" value={tCounts.blocked} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Today&apos;s workforce</h2>
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
                      <div className="text-sm font-medium truncate">{e.name}</div>
                      <div className="text-xs text-[var(--muted)] truncate">{e.title}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a?.status === "PRESENT" && <span className="text-xs text-[var(--muted)]">{a.workMode === "WFH" ? "WFH" : "Office"}</span>}
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
        <h2 className="font-semibold mb-4">Recent activity</h2>
        <ActivityFeed activity={activity} />
      </Card>
    </div>
  );
}

// ---------------- MANAGER ----------------

async function ManagerDashboard({ user, today }: { user: { id: string; role: string }; today: Date }) {
  const projectIds = await visibleProjectIds(user);
  const teamIds = await visibleEmployeeIds(user);
  const scopedProjectWhere = projectIds === "ALL" ? {} : { id: { in: projectIds } };
  const scopedTeamWhere = teamIds === "ALL" ? {} : { id: { in: teamIds } };

  const [team, todaysAttendance, projects] = await Promise.all([
    prisma.employee.findMany({ where: { ...scopedTeamWhere, active: true } }),
    prisma.attendance.findMany({ where: { date: today, employee: scopedTeamWhere }, include: { employee: true } }),
    prisma.project.findMany({
      where: scopedProjectWhere,
      include: { tasks: true, assignments: { where: { active: true }, include: { employee: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const present = todaysAttendance.filter((a) => a.status === "PRESENT");
  const wfh = present.filter((a) => a.workMode === "WFH").length;
  const office = present.filter((a) => a.workMode === "OFFICE").length;

  const allTasks = projects.flatMap((p) => p.tasks);
  const tCounts = taskCounts(allTasks);
  const dueToday = allTasks.filter((t) => t.dueDate && startOfDay(new Date(t.dueDate)).getTime() === today.getTime() && t.status !== "COMPLETED").length;

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total team" value={team.length} />
        <StatCard label="Present" value={present.length} />
        <StatCard label="WFH" value={wfh} />
        <StatCard label="Office" value={office} />
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">My projects</h2>
        <div className="space-y-4">
          {projects.map((p) => (
            <ProjectProgressRow key={p.id} p={p} showTaskCount />
          ))}
          {projects.length === 0 && <div className="text-sm text-[var(--muted)]">No projects assigned yet.</div>}
        </div>
      </Card>

      <Card className="p-5 overflow-x-auto">
        <h2 className="font-semibold mb-4">Team status</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="pb-2 font-medium">Employee</th>
              <th className="pb-2 font-medium">Project</th>
              <th className="pb-2 font-medium">Today</th>
            </tr>
          </thead>
          <tbody>
            {team.map((e) => {
              const a = todaysAttendance.find((x) => x.employeeId === e.id);
              const proj = projects.find((p) => p.assignments.some((asn) => asn.employeeId === e.id));
              return (
                <tr key={e.id} className="border-t border-[var(--border)]">
                  <td className="py-2.5 pr-4 flex items-center gap-2">
                    <Avatar name={e.name} />
                    <span className="text-sm">{e.name}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-sm text-[var(--muted)]">{proj?.name ?? "—"}</td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <AttendanceBadge status={a?.status ?? "LEAVE"} />
                      {a?.status === "PRESENT" && <span className="text-xs text-[var(--muted)]">{a.workMode}</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Tasks requiring attention</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-red-400">{tCounts.overdue} overdue</span>
          <span className="text-[var(--foreground)]">{tCounts.blocked} blocked</span>
          <span className="text-[var(--muted)]">{dueToday} due today</span>
        </div>
      </Card>
    </div>
  );
}

// ---------------- DEVELOPER ----------------

async function DeveloperDashboard({ user, today }: { user: { id: string; role: string; name?: string | null }; today: Date }) {
  const [employee, attendance, tasks, assignments] = await Promise.all([
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
