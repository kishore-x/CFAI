export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Card, StageBadge, Avatar } from "@/lib/ui";
import { ProjectControls } from "./project-controls";
import { auth } from "@/lib/auth";

export default async function ProjectsPage() {
  const session = await auth();
  const canManage = session?.user?.role === "OWNER" || session?.user?.role === "MANAGER";

  const projects = await prisma.project.findMany({
    include: {
      assignments: { include: { employee: true } },
      tasks: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-[var(--muted)] mt-1">{projects.length} projects tracked</p>
      </div>

      <div className="space-y-4">
        {projects.map((p) => {
          const done = p.tasks.filter((t) => t.status === "DONE").length;
          return (
            <Card key={p.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{p.name}</h2>
                    <StageBadge stage={p.stage} />
                  </div>
                  {p.client && <div className="text-xs text-[var(--muted)] mt-0.5">{p.client}</div>}
                  {p.description && <div className="text-sm text-[var(--muted)] mt-2">{p.description}</div>}
                </div>
                {canManage && <ProjectControls projectId={p.id} stage={p.stage} progress={p.progress} />}
              </div>

              <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${p.progress}%` }} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
                {p.deadline && <span>Deadline: {new Date(p.deadline).toLocaleDateString("en-GB")}</span>}
                <span>{done}/{p.tasks.length} tasks done</span>
                {p.githubRepoUrl && (
                  <a href={p.githubRepoUrl} target="_blank" className="text-[var(--accent)] hover:underline">
                    GitHub repo
                  </a>
                )}
                {p.vercelProjectUrl && (
                  <a href={p.vercelProjectUrl} target="_blank" className="text-[var(--accent)] hover:underline">
                    Vercel project
                  </a>
                )}
              </div>

              {p.assignments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {p.assignments.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 rounded-md bg-white/5 pl-1.5 pr-3 py-1.5">
                      <Avatar name={a.employee.name} color={a.employee.avatarColor} />
                      <div className="text-xs">
                        <div className="font-medium">{a.employee.name}</div>
                        <div className="text-[var(--muted)]">{a.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
