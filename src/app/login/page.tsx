export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { LoginPageClient } from "./login-form";

const QUICK_LOGIN_ENABLED = process.env.VERCEL_ENV !== "production" && process.env.NODE_ENV !== "production";

export default async function LoginPage() {
  const roster = QUICK_LOGIN_ENABLED
    ? await prisma.employee.findMany({
        where: { active: true },
        select: { id: true, name: true, role: true, title: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      })
    : [];

  return <LoginPageClient roster={roster} />;
}
