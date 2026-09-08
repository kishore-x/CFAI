export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div>}
    </Card>
  );
}

const PROJECT_STATUS_STYLES: Record<string, string> = {
  PLANNING: "border border-[var(--border)] text-[var(--muted)]",
  ACTIVE: "bg-gray-700 text-white",
  ON_HOLD: "border border-dashed border-[var(--border)] text-[var(--muted)] line-through",
  COMPLETED: "bg-white text-black",
  CANCELLED: "border border-dashed border-white/40 text-[var(--muted)] line-through",
};

export function ProjectStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PROJECT_STATUS_STYLES[status] ?? "border border-[var(--border)]"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

const TASK_STATUS_STYLES: Record<string, string> = {
  TODO: "border border-[var(--border)] text-[var(--muted)]",
  IN_PROGRESS: "bg-gray-700 text-white",
  BLOCKED: "border border-white/50 text-white",
  IN_REVIEW: "bg-gray-400 text-black",
  COMPLETED: "bg-white text-black",
};

export function TaskStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${TASK_STATUS_STYLES[status] ?? "border border-[var(--border)]"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

const TASK_PRIORITY_STYLES: Record<string, string> = {
  LOW: "text-[var(--muted)]",
  MEDIUM: "text-[var(--foreground)]",
  HIGH: "text-white font-semibold",
  URGENT: "text-white font-semibold underline decoration-white/60",
};

export function TaskPriorityLabel({ priority }: { priority: string }) {
  return <span className={`text-[11px] ${TASK_PRIORITY_STYLES[priority] ?? ""}`}>{priority}</span>;
}

const ATTENDANCE_STYLES: Record<string, string> = {
  PRESENT: "bg-white text-black",
  LEAVE: "border border-[var(--foreground)] text-[var(--foreground)]",
  HOLIDAY: "bg-gray-400 text-black",
  WEEKEND: "border border-dashed border-[var(--border)] text-[var(--muted)]",
};

export function AttendanceBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ATTENDANCE_STYLES[status] ?? "border border-[var(--border)]"}`}>
      {status}
    </span>
  );
}

const AVATAR_SHADES = ["#e5e5e5", "#c4c4c4", "#a3a3a3", "#868686", "#6b6b6b"];

function shadeFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_SHADES[hash % AVATAR_SHADES.length];
}

export function Avatar({ name }: { name: string; color?: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="h-9 w-9 rounded-full flex items-center justify-center text-black text-xs font-semibold shrink-0"
      style={{ backgroundColor: shadeFor(name) }}
    >
      {initials}
    </div>
  );
}

export function fmtHours(ms: number) {
  const hours = ms / (1000 * 60 * 60);
  return `${hours.toFixed(1)}h`;
}

export function fmtTime(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}
