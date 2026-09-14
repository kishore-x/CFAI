import { Card } from "@/lib/ui";

type Activity = { id: string; type: string; description: string; createdAt: Date; actor: { name: string } };

const TYPE_ICON: Record<string, string> = {
  LEAD_CREATED: "＋",
  STATUS_CHANGE: "↻",
  STAGE_CHANGE: "↻",
  NOTE: "✎",
  CONVERTED: "↗",
  OPPORTUNITY_CREATED: "＋",
  FOLLOW_UP_COMPLETED: "✓",
  MEETING_SCHEDULED: "📅",
  MEETING_COMPLETED: "✓",
  PROPOSAL_CREATED: "＋",
  PROPOSAL_STATUS: "↻",
};

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  return (
    <Card className="p-5">
      <h2 className="font-semibold mb-3">Activity</h2>
      <ul className="space-y-3 text-sm">
        {activities.map((a) => (
          <li key={a.id} className="flex items-start gap-3">
            <span className="text-[var(--muted)] shrink-0 mt-0.5">{TYPE_ICON[a.type] ?? "•"}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate">{a.description}</div>
              <div className="text-xs text-[var(--muted)] mt-0.5">
                {a.actor.name} · {new Date(a.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </li>
        ))}
        {activities.length === 0 && <li className="text-sm text-[var(--muted)]">No activity yet.</li>}
      </ul>
    </Card>
  );
}
