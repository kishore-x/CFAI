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

const STAGE_STYLES: Record<string, string> = {
  PLANNING: "border border-[var(--border)] text-[var(--muted)]",
  DESIGN: "border border-white/40 text-[var(--foreground)]",
  DEVELOPMENT: "bg-gray-700 text-white",
  TESTING: "bg-gray-400 text-black",
  DEPLOYED: "bg-white text-black",
  MAINTENANCE: "border border-dashed border-white/40 text-[var(--foreground)]",
  ON_HOLD: "border border-dashed border-[var(--border)] text-[var(--muted)] line-through",
};

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STAGE_STYLES[stage] ?? "border border-[var(--border)]"}`}>
      {stage.replace("_", " ")}
    </span>
  );
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
