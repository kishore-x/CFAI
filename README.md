# ClickfieldAI Hub

Internal team, attendance, and project management dashboard.

## Features

- Employee directory with GitHub/Vercel usernames and Claude account labels (no credentials stored)
- Daily attendance: present/leave/WFH/office, clock in/out, auto-computed hours worked
- Project tracker: stage, progress %, deadline, assigned team, GitHub repo + Vercel project links
- Live overview dashboard

## Stack

Next.js (App Router) + Prisma 7 + SQLite (via `better-sqlite3` driver adapter) + Tailwind CSS.

## Getting started

```bash
npm install
npx prisma migrate dev
npx tsx prisma/seed.ts   # optional: loads sample data
npm run dev
```

Visit http://localhost:3000.

## Data model

See `prisma/schema.prisma`: `Employee`, `Attendance`, `LeaveRequest`, `Project`, `ProjectAssignment`, `Task`.

## Notes

- No passwords, tokens, or API keys are stored anywhere in this app — only usernames and public project/repo links.
- SQLite is used for simplicity; swap the `DATABASE_URL` and driver adapter in `src/lib/db.ts` for Postgres/MySQL if this needs to run on shared infrastructure (e.g. deployed to Vercel with a hosted Postgres DB).
