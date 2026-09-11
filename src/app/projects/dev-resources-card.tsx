"use client";

import { useState, useTransition } from "react";
import { updateProjectDevResources } from "@/app/actions";
import { Card, DevResourceStatusBadge } from "@/lib/ui";

export type DevResources = {
  githubRepoUrl: string | null;
  vercelProjectUrl: string | null;
  claudeAccountName: string | null;
  productionUrl: string | null;
  stagingUrl: string | null;
  developmentBranch: string | null;
  techStack: string | null;
  devResourceStatus: string | null;
};

const DEV_STATUSES = ["ACTIVE", "PAUSED", "COMPLETED"];

function stripProtocol(url: string) {
  return url.replace(/^https?:\/\//, "");
}

function ResourceRow({ label, value, url }: { label: string; value: string; url?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="text-xs text-[var(--muted)]">{label}</div>
        <div className="text-sm truncate">{value}</div>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs font-medium px-2.5 py-1.5 rounded-md border border-[var(--border)] hover:bg-white/10 whitespace-nowrap"
        >
          Open ↗
        </a>
      )}
    </div>
  );
}

export function DevResourcesCard({
  projectId,
  resources,
  canManage,
}: {
  projectId: string;
  resources: DevResources;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasAny =
    resources.githubRepoUrl ||
    resources.vercelProjectUrl ||
    resources.claudeAccountName ||
    resources.productionUrl ||
    resources.stagingUrl ||
    resources.developmentBranch ||
    resources.techStack;

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      githubRepoUrl: String(form.get("githubRepoUrl") ?? ""),
      vercelProjectUrl: String(form.get("vercelProjectUrl") ?? ""),
      claudeAccountName: String(form.get("claudeAccountName") ?? ""),
      productionUrl: String(form.get("productionUrl") ?? ""),
      stagingUrl: String(form.get("stagingUrl") ?? ""),
      developmentBranch: String(form.get("developmentBranch") ?? ""),
      techStack: String(form.get("techStack") ?? ""),
      devResourceStatus: String(form.get("devResourceStatus") ?? ""),
    };
    startTransition(async () => {
      try {
        await updateProjectDevResources(projectId, payload);
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Development resources</h2>
          {resources.devResourceStatus && <DevResourceStatusBadge status={resources.devResourceStatus} />}
        </div>
        {canManage && !editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-[var(--accent)] hover:underline">
            {hasAny ? "Edit" : "+ Add"}
          </button>
        )}
      </div>

      {!editing && !hasAny && (
        <p className="text-sm text-[var(--muted)] mt-2">
          No development resources added yet.
          {canManage && " Add a GitHub repo, Vercel deployment, or Claude workspace so the team can find them here."}
        </p>
      )}

      {!editing && hasAny && (
        <div className="divide-y divide-[var(--border)]">
          {resources.githubRepoUrl && <ResourceRow label="GitHub" value={stripProtocol(resources.githubRepoUrl)} url={resources.githubRepoUrl} />}
          {resources.vercelProjectUrl && <ResourceRow label="Vercel" value={stripProtocol(resources.vercelProjectUrl)} url={resources.vercelProjectUrl} />}
          {resources.claudeAccountName && <ResourceRow label="Claude" value={resources.claudeAccountName} />}
          {resources.productionUrl && <ResourceRow label="Production URL" value={stripProtocol(resources.productionUrl)} url={resources.productionUrl} />}
          {resources.stagingUrl && <ResourceRow label="Staging / preview URL" value={stripProtocol(resources.stagingUrl)} url={resources.stagingUrl} />}
          {resources.developmentBranch && <ResourceRow label="Development branch" value={resources.developmentBranch} />}
          {resources.techStack && <ResourceRow label="Tech stack" value={resources.techStack} />}
        </div>
      )}

      {editing && canManage && (
        <form onSubmit={handleSave} className="mt-3 grid sm:grid-cols-2 gap-3">
          <label className="text-xs text-[var(--muted)] sm:col-span-2">
            GitHub Repository URL
            <input
              name="githubRepoUrl"
              defaultValue={resources.githubRepoUrl ?? ""}
              placeholder="https://github.com/org/repo"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60"
            />
          </label>
          <label className="text-xs text-[var(--muted)]">
            Vercel URL
            <input
              name="vercelProjectUrl"
              defaultValue={resources.vercelProjectUrl ?? ""}
              placeholder="https://project.vercel.app"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60"
            />
          </label>
          <label className="text-xs text-[var(--muted)]">
            Claude Account / Workspace
            <input
              name="claudeAccountName"
              defaultValue={resources.claudeAccountName ?? ""}
              placeholder="ClickfieldAI — Ananya"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60"
            />
          </label>
          <label className="text-xs text-[var(--muted)]">
            Production URL
            <input
              name="productionUrl"
              defaultValue={resources.productionUrl ?? ""}
              placeholder="https://app.client.com"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60"
            />
          </label>
          <label className="text-xs text-[var(--muted)]">
            Staging / Preview URL
            <input
              name="stagingUrl"
              defaultValue={resources.stagingUrl ?? ""}
              placeholder="https://staging-client.vercel.app"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60"
            />
          </label>
          <label className="text-xs text-[var(--muted)]">
            Development Branch
            <input
              name="developmentBranch"
              defaultValue={resources.developmentBranch ?? ""}
              placeholder="main"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60"
            />
          </label>
          <label className="text-xs text-[var(--muted)]">
            Development Status
            <select
              name="devResourceStatus"
              defaultValue={resources.devResourceStatus ?? ""}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-white/60"
            >
              <option value="">Not set</option>
              {DEV_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[var(--muted)] sm:col-span-2">
            Tech Stack
            <input
              name="techStack"
              defaultValue={resources.techStack ?? ""}
              placeholder="Next.js, TypeScript, PostgreSQL, Prisma"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/60"
            />
          </label>

          {error && <p className="sm:col-span-2 text-xs text-red-400">{error}</p>}

          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={isPending} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--accent)] text-black disabled:opacity-50">
              {isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="text-xs text-[var(--muted)]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
