"use server";

import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUser, assertCanManageProject, logActivity } from "@/lib/authorize";
import { validateGenericUrl } from "@/lib/validation";

// Owner/PM only — matches assertCanManageProject used everywhere else for
// project-level changes. Anyone with project access can still view/download
// (enforced by the project detail page itself, not here).

export async function uploadProjectDocument(projectId: string, formData: FormData) {
  const user = await requireUser();
  await assertCanManageProject(user, projectId);

  const file = formData.get("file") as File | null;
  const title = String(formData.get("title") ?? "").trim();
  if (!file || file.size === 0) throw new Error("Choose a file to upload");
  if (!title) throw new Error("Title is required");

  const blob = await put(`projects/${projectId}/${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  await prisma.projectDocument.create({
    data: {
      projectId,
      type: "DOCUMENT",
      title,
      url: blob.url,
      fileName: file.name,
      fileSize: file.size,
      uploadedById: user.id,
    },
  });
  await logActivity({ actorId: user.id, action: "PROJECT_DOCUMENT_ADDED", entityType: "Project", entityId: projectId, metadata: { title } });
  revalidatePath(`/projects/${projectId}`);
}

export async function addMeetingLink(projectId: string, title: string, url: string) {
  const user = await requireUser();
  await assertCanManageProject(user, projectId);

  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title is required");
  const result = validateGenericUrl(url);
  if (!result.ok) throw new Error(result.error);

  await prisma.projectDocument.create({
    data: { projectId, type: "MEETING_LINK", title: trimmed, url: result.value, uploadedById: user.id },
  });
  await logActivity({ actorId: user.id, action: "PROJECT_DOCUMENT_ADDED", entityType: "Project", entityId: projectId, metadata: { title: trimmed, type: "MEETING_LINK" } });
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectDocument(documentId: string) {
  const user = await requireUser();
  const doc = await prisma.projectDocument.findUniqueOrThrow({ where: { id: documentId } });
  await assertCanManageProject(user, doc.projectId);

  if (doc.type === "DOCUMENT") {
    try {
      await del(doc.url);
    } catch {
      // Best-effort — don't block removing the record if the blob is already gone.
    }
  }
  await prisma.projectDocument.delete({ where: { id: documentId } });
  revalidatePath(`/projects/${doc.projectId}`);
}
