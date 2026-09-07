# Agent notes

Standard Next.js 16 (App Router) project. No non-standard conventions.

- Database: Prisma 7 + SQLite via `better-sqlite3` driver adapter (`src/lib/db.ts`)
- UI: Tailwind CSS, server components by default, client components only for interactive controls (`src/app/**/*-row.tsx`, `*-controls.tsx`)
- Server actions live in `src/app/actions.ts`
