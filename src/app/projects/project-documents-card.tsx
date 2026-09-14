"use client";

import { useState, useTransition } from "react";
import { Card } from "@/lib/ui";
import { uploadProjectDocument, addMeetingLink, deleteProjectDocument } from "./document-actions";

export type ProjectDocumentItem = {
  id: string;
  type: "DOCUMENT" | "MEETING_LINK";
  title: string;
  url: string;
  fileName: string | null;
  fileSize: number | null;
  uploadedByName: string;
  createdAt: string;
};

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectDocumentsCard({ projectId, documents, canManage }: { projectId: string; documents: ProjectDocumentItem[]; canManage: boolean }) {
  const [mode, setMode] = useState<"none" | "upload" | "link">("none");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await uploadProjectDocument(projectId, formData);
        form.reset();
        setMode("none");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload document");
      }
    });
  }

  function handleAddLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "");
    const url = String(form.get("url") ?? "");
    startTransition(async () => {
      try {
        await addMeetingLink(projectId, title, url);
        (e.target as HTMLFormElement).reset();
        setMode("none");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add meeting link");
      }
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Meeting notes &amp; documents</h2>
        {canManage && mode === "none" && (
          <div className="flex items-center gap-2">
            <button onClick={() => setMode("upload")} className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--overlay-10)]">
              + Upload document
            </button>
            <button onClick={() => setMode("link")} className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--overlay-10)]">
              + Add meeting link
            </button>
          </div>
        )}
      </div>

      {mode === "upload" && (
        <form onSubmit={handleUpload} className="mb-4 space-y-2 rounded-md border border-[var(--border)] p-3">
          <input name="title" required placeholder="Title (e.g. Client meeting notes — 14 Sept)" className="w-full rounded-md border border-[var(--border)] bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-[var(--border-60)]" />
          <input name="file" type="file" required className="w-full text-xs text-[var(--muted)] file:mr-3 file:rounded-md file:border file:border-[var(--border)] file:bg-transparent file:px-2.5 file:py-1.5 file:text-xs file:text-[var(--foreground)]" />
          <div className="flex items-center gap-2">
            <button type="submit" disabled={isPending} className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] disabled:opacity-50">
              {isPending ? "Uploading…" : "Upload"}
            </button>
            <button type="button" onClick={() => { setMode("none"); setError(null); }} className="text-xs text-[var(--muted)]">
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "link" && (
        <form onSubmit={handleAddLink} className="mb-4 space-y-2 rounded-md border border-[var(--border)] p-3">
          <input name="title" required placeholder="Title (e.g. Kickoff call recording)" className="w-full rounded-md border border-[var(--border)] bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-[var(--border-60)]" />
          <input name="url" type="url" required placeholder="https://…" className="w-full rounded-md border border-[var(--border)] bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-[var(--border-60)]" />
          <div className="flex items-center gap-2">
            <button type="submit" disabled={isPending} className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] disabled:opacity-50">
              {isPending ? "Adding…" : "Add link"}
            </button>
            <button type="button" onClick={() => { setMode("none"); setError(null); }} className="text-xs text-[var(--muted)]">
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <ul className="divide-y divide-[var(--border)]">
        {documents.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline truncate block">
                {d.title}
              </a>
              <div className="text-xs text-[var(--muted)] mt-0.5">
                {d.type === "MEETING_LINK" ? "Meeting link" : d.fileName}
                {d.fileSize ? ` · ${fmtSize(d.fileSize)}` : ""} · {d.uploadedByName} · {new Date(d.createdAt).toLocaleDateString("en-GB")}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--overlay-10)] whitespace-nowrap">
                Open ↗
              </a>
              {canManage && (
                <button
                  disabled={isPending}
                  onClick={() => startTransition(() => deleteProjectDocument(d.id))}
                  className="text-xs text-[var(--muted)] hover:text-red-400 disabled:opacity-50"
                  title="Remove"
                >
                  ✕
                </button>
              )}
            </div>
          </li>
        ))}
        {documents.length === 0 && <li className="py-2 text-sm text-[var(--muted)]">No documents or meeting links yet.</li>}
      </ul>
    </Card>
  );
}
