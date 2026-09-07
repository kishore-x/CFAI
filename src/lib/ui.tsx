export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-400">{hint}</div>}
    </Card>
  );
}

const STAGE_STYLES: Record<string, string> = {
  PLANNING: "bg-gray-100 text-gray-700",
  DESIGN: "bg-purple-100 text-purple-700",
  DEVELOPMENT: "bg-blue-100 text-blue-700",
  TESTING: "bg-amber-100 text-amber-700",
  DEPLOYED: "bg-emerald-100 text-emerald-700",
  MAINTENANCE: "bg-teal-100 text-teal-700",
  ON_HOLD: "bg-red-100 text-red-700",
};

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STAGE_STYLES[stage] ?? "bg-gray-100 text-gray-700"}`}>
      {stage.replace("_", " ")}
    </span>
  );
}

const ATTENDANCE_STYLES: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-700",
  LEAVE: "bg-red-100 text-red-700",
  HOLIDAY: "bg-blue-100 text-blue-700",
  WEEKEND: "bg-gray-100 text-gray-700",
};

export function AttendanceBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ATTENDANCE_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

export function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
      style={{ backgroundColor: color }}
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
