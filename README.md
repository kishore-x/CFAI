# ClickfieldAI Hub

Internal team, attendance, and project management dashboard.

## Features

- Employee directory with GitHub/Vercel usernames and Claude account labels (no credentials stored)
- Daily attendance: present/leave/WFH/office, clock in/out, auto-computed hours worked
- Project tracker: stage, progress %, deadline, assigned team, GitHub repo + Vercel project links
- Live overview dashboard

## Stack

Next.js (App Router) + Prisma 7 + PostgreSQL (Supabase) via `@prisma/adapter-pg` + Tailwind CSS.

## Getting started

```bash
npm install
npx prisma migrate dev   # applies schema to your DATABASE_URL
npx tsx prisma/seed.ts   # optional: loads sample data
npm run dev
```

Visit http://localhost:3000.

## Environment variables

Set `DATABASE_URL` in `.env` (never committed) to your Postgres connection string.

For Supabase specifically:
- **Migrations** (`prisma migrate dev`) need the **session pooler** connection, port `5432` — the direct `db.<ref>.supabase.co:5432` host is IPv6-only and unreachable from most networks/CI.
- **App runtime** should use the **transaction pooler**, port `6543`, with `?pgbouncer=true` appended — this is what's set as the deployed `DATABASE_URL` on Vercel, since serverless functions open many short-lived connections.
- Any password containing special characters (e.g. `/`) must be URL-encoded (`/` → `%2F`).

## Data model

See `prisma/schema.prisma`: `Employee`, `Attendance`, `LeaveRequest`, `Project`, `ProjectAssignment`, `Task`.

## Notes

- No passwords, tokens, or API keys are stored anywhere in this app — only usernames and public project/repo links.
