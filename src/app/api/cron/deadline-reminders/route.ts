import { NextResponse } from "next/server";
import { runDeadlineReminders, runSalesReminders } from "@/lib/deadline-reminders";

export const dynamic = "force-dynamic";

// Triggered by Vercel Cron (see vercel.json). Vercel automatically sends
// `Authorization: Bearer $CRON_SECRET` on cron-triggered requests when a
// CRON_SECRET env var is set on the project.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const [tasks, sales] = await Promise.all([runDeadlineReminders(), runSalesReminders()]);
  return NextResponse.json({ ok: true, tasks, sales });
}
