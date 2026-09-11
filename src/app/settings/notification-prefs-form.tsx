"use client";

import { useState, useTransition } from "react";
import { updateMyNotificationPreference } from "./settings-actions";

export type NotificationPrefs = {
  emailEnabled: boolean;
  taskAssigned: boolean;
  taskCompleted: boolean;
  taskBlocked: boolean;
  clarificationRequested: boolean;
  leaveRequested: boolean;
  leaveApproved: boolean;
  leaveRejected: boolean;
  newMessage: boolean;
  dailyWorkUpdate: boolean;
  deadlineReminder: boolean;
};

type ItemKey = Exclude<keyof NotificationPrefs, "emailEnabled">;

const GROUPS: { title: string; items: { key: ItemKey; label: string }[] }[] = [
  {
    title: "Task & Project",
    items: [
      { key: "taskAssigned", label: "Task assigned/reassigned" },
      { key: "taskCompleted", label: "Task completed" },
      { key: "taskBlocked", label: "Task blocked" },
      { key: "clarificationRequested", label: "Clarification requested" },
      { key: "deadlineReminder", label: "Deadline reminders" },
    ],
  },
  {
    title: "Leave",
    items: [
      { key: "leaveRequested", label: "Leave requests" },
      { key: "leaveApproved", label: "Leave approved" },
      { key: "leaveRejected", label: "Leave rejected" },
    ],
  },
  {
    title: "Communication",
    items: [{ key: "newMessage", label: "New messages" }],
  },
  {
    title: "Work Updates",
    items: [{ key: "dailyWorkUpdate", label: "Daily work updates" }],
  },
];

export function NotificationPreferencesForm({ initial }: { initial: NotificationPrefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function toggle(key: keyof NotificationPrefs) {
    const value = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: value }));
    startTransition(() => updateMyNotificationPreference(key, value));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2.5">
        <div>
          <div className="text-sm font-medium">Email notifications</div>
          <div className="text-xs text-[var(--muted)]">Receive important updates by email.</div>
        </div>
        <button
          onClick={() => toggle("emailEnabled")}
          disabled={isPending}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 ${
            prefs.emailEnabled ? "bg-[var(--accent)] text-black" : "border border-[var(--border)] text-[var(--muted)]"
          }`}
        >
          {prefs.emailEnabled ? "ON" : "OFF"}
        </button>
      </div>

      <div className={`grid sm:grid-cols-2 gap-5 transition-opacity ${!prefs.emailEnabled ? "opacity-40 pointer-events-none" : ""}`}>
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="text-xs font-medium text-[var(--muted)] mb-2">{g.title}</div>
            <div className="space-y-2">
              {g.items.map((item) => (
                <label key={item.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs[item.key]}
                    onChange={() => toggle(item.key)}
                    disabled={isPending || !prefs.emailEnabled}
                    className="h-4 w-4 accent-white"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
