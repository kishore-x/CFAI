export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { LoginPageClient } from "./login-form";
import { isQuickLoginEnabled } from "@/lib/quick-login";

export default async function LoginPage() {
  const roster = isQuickLoginEnabled()
    ? await prisma.employee.findMany({
        where: { active: true },
        select: { id: true, name: true, role: true, title: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      })
    : [];

  return <LoginPageClient roster={roster} />;
}
