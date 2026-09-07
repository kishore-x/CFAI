export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { LoginPageClient } from "./login-form";

export default async function LoginPage() {
  const roster = await prisma.employee.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true, title: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return <LoginPageClient roster={roster} />;
}
