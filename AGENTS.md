# Agent notes

Standard Next.js 16 (App Router) project. No non-standard conventions.

- Database: Prisma 7 + PostgreSQL (Supabase) via `@prisma/adapter-pg` driver adapter (`src/lib/db.ts`)
- Auth: Auth.js v5 (`src/lib/auth.ts` full config, `src/lib/auth.config.ts` edge-safe subset used by `src/proxy.ts`)
- Authorization: centralized in `src/lib/authorize.ts` — every server action and every page's data query must go through its scoping helpers (`visibleProjectIds`, `visibleEmployeeIds`, `canAccessProject`, `canManageProject`, etc.). Never trust the client-sent role; always re-derive from the session.
- UI: Tailwind CSS, server components by default, client components only for interactive controls
- Server actions live in `src/app/actions.ts`, plus per-domain action files next to their pages (`src/app/tasks/task-actions.ts`, `src/app/messages/chat-actions.ts`, `src/app/daily-updates/daily-update-actions.ts`, `src/app/settings/settings-actions.ts`, `src/app/projects/milestone-actions.ts`)
- Reusable calculations (progress, workload, attendance summaries, leave balance) live in `src/lib/services.ts` and `src/lib/attendance-stats.ts` — don't reimplement them inline in a page
- No Audit Log module (explicitly out of scope, do not re-add). `ActivityLog` still exists as internal bookkeeping and powers the per-task/per-project "Activity" feeds only.
- Email: all outbound email goes through `src/lib/email.ts` (Resend) — never call Resend directly from a page/action. Each event helper (`sendTaskAssignedEmail`, etc.) internally checks the recipient's `NotificationPreference` and swallows send failures, so it's always safe to call after the matching in-app `notify()`/`notifyMany()` call. Only "important" events get email (see that file); don't wire up email for routine/minor updates.

