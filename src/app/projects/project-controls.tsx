"use client";

import { useTransition } from "react";
import { updateProjectStage, updateProjectProgress } from "@/app/actions";

const STAGES = ["PLANNING", "DESIGN", "DEVELOPMENT", "TESTING", "DEPLOYED", "MAINTENANCE", "ON_HOLD"];

export function ProjectControls({ projectId, stage, progress }: { projectId: string; stage: string; progress: number }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <select
        className="text-xs border border-[var(--border)] rounded-md px-2 py-1 bg-white disabled:opacity-50"
        value={stage}
        disabled={isPending}
        onChange={(e) => startTransition(() => updateProjectStage(projectId, e.target.value))}
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {s.replace("_", " ")}
          </option>
        ))}
      </select>
      <input
        type="range"
        min={0}
        max={100}
        value={progress}
        disabled={isPending}
        onChange={(e) => startTransition(() => updateProjectProgress(projectId, Number(e.target.value)))}
        className="w-28 accent-[var(--accent)]"
      />
      <span className="text-xs text-gray-400 w-9">{progress}%</span>
    </div>
  );
}
