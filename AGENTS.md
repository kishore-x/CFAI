# Agent notes

Standard Next.js 16 (App Router) project. No non-standard conventions.

- Database: Prisma 7 + PostgreSQL (Supabase) via `@prisma/adapter-pg` driver adapter (`src/lib/db.ts`)
- Auth: Auth.js v5 (`src/lib/auth.ts` full config, `src/lib/auth.config.ts` edge-safe subset used by `src/proxy.ts`)
- Authorization: centralized in `src/lib/authorize.ts` — every server action and every page's data query must go through its scoping helpers (`visibleProjectIds`, `visibleEmployeeIds`, `canAccessProject`, `canManageProject`, etc.). Never trust the client-sent role; always re-derive from the session.
- UI: Tailwind CSS, server components by default, client components only for interactive controls
- Server actions live in `src/app/actions.ts`
