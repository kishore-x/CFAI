# ClickfieldAI Hub

Internal team, attendance, and project management dashboard.

## Features

- Login with role-based access: **Owner** and **Project Manager** roles can edit anyone's attendance and project stage/progress; **Developer** role can only manage their own attendance and view everything else
- Employee directory with GitHub/Vercel usernames and Claude account labels (no credentials stored)
- Daily attendance: present/leave/WFH/office, clock in/out, auto-computed hours worked
- Project tracker: stage, progress %, deadline, assigned team, GitHub repo + Vercel project links
- Live overview dashboard

## Stack

Next.js (App Router) + Prisma 7 + PostgreSQL (Supabase) via `@prisma/adapter-pg` + Auth.js (NextAuth v5, credentials + JWT sessions) + Tailwind CSS.

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

Also set `AUTH_SECRET` (a random 32-byte base64 string, e.g. `openssl rand -base64 32`) — required by Auth.js to sign session tokens. Must be set on Vercel too (Production and Preview).

## Logging in

Run `npx tsx prisma/seed.ts` to (re)create the employee roster with fresh random temporary passwords — it prints a credentials table to the console once. Share each password with its owner; everyone is forced to set their own password on first login (`/account/change-password`). Passwords are bcrypt-hashed; nothing plaintext is ever stored.

## Data model

See `prisma/schema.prisma`: `Employee`, `Attendance`, `LeaveRequest`, `Project`, `ProjectAssignment`, `Task`.

## Notes

- No passwords, tokens, or API keys are stored anywhere in this app — only usernames and public project/repo links.
