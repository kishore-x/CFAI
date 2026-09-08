import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { hashPassword, generateTempPassword } from "../src/lib/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

async function main() {
  await prisma.activityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectAssignment.deleteMany();
  await prisma.project.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.employee.deleteMany();

  const colors = ["#6366f1", "#0ea5e9", "#f97316", "#10b981", "#ec4899", "#a855f7", "#84cc16"];

  const roster = [
    { name: "Kishore", email: "clickfieldai@gmail.com", title: "Founder", department: "Leadership", role: "OWNER" as const, githubUsername: "kishore-x", claudeAccountLabel: "kishore-primary", vercelUsername: "kishore-x" },
    { name: "Ashwin", email: "ashwin@clickfieldai.com", title: "Co-founder", department: "Leadership", role: "OWNER" as const, githubUsername: "ashwin", claudeAccountLabel: "ashwin-primary", vercelUsername: "ashwin" },
    { name: "Sneha Iyer", email: "sneha@clickfieldai.com", title: "Project Manager", department: "Operations", role: "MANAGER" as const, githubUsername: "sneha-i", claudeAccountLabel: "ops-seat-1", vercelUsername: null },
    { name: "Ananya Rao", email: "ananya@clickfieldai.com", title: "Full-stack Developer", department: "Engineering", role: "DEVELOPER" as const, githubUsername: "ananya-dev", claudeAccountLabel: "eng-seat-1", vercelUsername: "ananya-rao" },
    { name: "Rahul Mehta", email: "rahul@clickfieldai.com", title: "Frontend Developer", department: "Engineering", role: "DEVELOPER" as const, githubUsername: "rahulm", claudeAccountLabel: "eng-seat-2", vercelUsername: "rahul-mehta" },
    { name: "Priya Nair", email: "priya@clickfieldai.com", title: "UI/UX Designer", department: "Design", role: "DEVELOPER" as const, githubUsername: "priyan", claudeAccountLabel: "design-seat-1", vercelUsername: "priya-nair" },
    { name: "Vikram Singh", email: "vikram@clickfieldai.com", title: "Backend Developer", department: "Engineering", role: "DEVELOPER" as const, githubUsername: "vikrams", claudeAccountLabel: "eng-seat-3", vercelUsername: "vikram-singh" },
  ];

  const credentials: { name: string; email: string; role: string; password: string }[] = [];

  const employees = await Promise.all(
    roster.map(async (e, i) => {
      const tempPassword = generateTempPassword();
      credentials.push({ name: e.name, email: e.email, role: e.role, password: tempPassword });
      const passwordHash = await hashPassword(tempPassword);
      return prisma.employee.create({
        data: { ...e, avatarColor: colors[i % colors.length], passwordHash, mustChangePassword: true },
      });
    })
  );

  const [kishore, , sneha, ananya, rahul, priya, vikram] = employees;

  // Project A (spec example): Sneha manages this, members Ananya/Rahul/Priya.
  const tostem = await prisma.project.create({
    data: {
      name: "TOSTEM Website Revamp",
      client: "TOSTEM",
      description: "Corporate site redesign and rebuild",
      status: "ACTIVE",
      startDate: new Date("2026-08-01"),
      deadline: new Date("2026-09-20"),
      managerId: sneha.id,
      githubRepoUrl: "https://github.com/clickfieldai/tostem-site",
      vercelProjectUrl: "https://vercel.com/clickfieldai/tostem-site",
    },
  });

  // Project B (spec example): no PM assigned; shares Rahul with Project A to
  // demonstrate a developer visible via two different projects.
  const dataAnalyzer = await prisma.project.create({
    data: {
      name: "Eng Data Analyzer",
      client: "Internal Product",
      description: "Manufacturing data analysis dashboard demo",
      status: "ACTIVE",
      startDate: new Date("2026-07-15"),
      deadline: new Date("2026-09-30"),
      githubRepoUrl: "https://github.com/clickfieldai/eng-data-analyzer",
      vercelProjectUrl: "https://vercel.com/clickfieldai/eng-data-analyzer",
    },
  });

  const laneFertility = await prisma.project.create({
    data: {
      name: "Lane Fertility Dashboard",
      client: "Lane Fertility",
      description: "Patient analytics dashboard",
      status: "COMPLETED",
      startDate: new Date("2026-06-01"),
      deadline: new Date("2026-08-01"),
      githubRepoUrl: "https://github.com/clickfieldai/lane-fertility-dashboard",
      vercelProjectUrl: "https://vercel.com/clickfieldai/lane-fertility-dashboard",
    },
  });

  const leadAgent = await prisma.project.create({
    data: {
      name: "LinkedIn Lead Qualification Agent",
      client: "Internal Product",
      description: "AI agent system to qualify inbound LinkedIn leads",
      status: "PLANNING",
      deadline: new Date("2026-11-01"),
    },
  });

  await prisma.projectAssignment.createMany({
    data: [
      { projectId: tostem.id, employeeId: ananya.id, role: "DEVELOPER" },
      { projectId: tostem.id, employeeId: rahul.id, role: "LEAD" },
      { projectId: tostem.id, employeeId: priya.id, role: "DESIGNER" },

      { projectId: dataAnalyzer.id, employeeId: vikram.id, role: "DEVELOPER" },
      { projectId: dataAnalyzer.id, employeeId: rahul.id, role: "CONTRIBUTOR" },

      { projectId: laneFertility.id, employeeId: ananya.id, role: "LEAD" },

      { projectId: leadAgent.id, employeeId: kishore.id, role: "LEAD" },
      { projectId: leadAgent.id, employeeId: vikram.id, role: "CONTRIBUTOR" },
    ],
  });

  await prisma.task.createMany({
    data: [
      { projectId: tostem.id, title: "Cross-browser QA pass", status: "IN_PROGRESS", priority: "HIGH", assignedToId: priya.id, createdById: sneha.id, dueDate: new Date("2026-09-15") },
      { projectId: tostem.id, title: "Client sign-off", status: "TODO", priority: "MEDIUM", assignedToId: rahul.id, createdById: sneha.id, dueDate: new Date("2026-09-18") },
      { projectId: tostem.id, title: "Fix authentication bug", status: "COMPLETED", priority: "URGENT", assignedToId: ananya.id, createdById: sneha.id, completedAt: new Date() },
      { projectId: tostem.id, title: "Update project documentation", status: "TODO", priority: "LOW", assignedToId: ananya.id, createdById: sneha.id },

      { projectId: dataAnalyzer.id, title: "Wire up CSV ingestion", status: "COMPLETED", priority: "MEDIUM", assignedToId: vikram.id, createdById: kishore.id, completedAt: new Date() },
      { projectId: dataAnalyzer.id, title: "Build anomaly detection view", status: "IN_PROGRESS", priority: "HIGH", assignedToId: vikram.id, createdById: kishore.id, dueDate: new Date("2026-09-10") },
      { projectId: dataAnalyzer.id, title: "Deploy staging build", status: "BLOCKED", priority: "URGENT", assignedToId: rahul.id, createdById: kishore.id, dueDate: new Date("2026-09-05") },

      { projectId: leadAgent.id, title: "Define ICP scoring rubric", status: "TODO", priority: "MEDIUM", createdById: kishore.id },
    ],
  });

  const today = startOfDay(new Date());

  const attendanceRows: {
    employeeId: string;
    date: Date;
    status: "PRESENT" | "LEAVE" | "HOLIDAY" | "WEEKEND";
    workMode: "OFFICE" | "WFH";
    clockIn?: Date;
    clockOut?: Date;
  }[] = [
    { employeeId: kishore.id, date: today, status: "PRESENT", workMode: "OFFICE", clockIn: new Date(`${today.toDateString()} 09:10`), clockOut: new Date(`${today.toDateString()} 19:05`) },
    { employeeId: ananya.id, date: today, status: "PRESENT", workMode: "WFH", clockIn: new Date(`${today.toDateString()} 09:45`), clockOut: new Date(`${today.toDateString()} 18:30`) },
    { employeeId: rahul.id, date: today, status: "PRESENT", workMode: "OFFICE", clockIn: new Date(`${today.toDateString()} 10:00`) },
    { employeeId: priya.id, date: today, status: "LEAVE", workMode: "OFFICE" },
    { employeeId: vikram.id, date: today, status: "PRESENT", workMode: "WFH", clockIn: new Date(`${today.toDateString()} 09:30`), clockOut: new Date(`${today.toDateString()} 18:15`) },
    { employeeId: sneha.id, date: today, status: "PRESENT", workMode: "OFFICE", clockIn: new Date(`${today.toDateString()} 09:00`), clockOut: new Date(`${today.toDateString()} 17:50`) },
  ];

  for (const row of attendanceRows) {
    await prisma.attendance.create({ data: row });
  }

  await prisma.leaveRequest.create({
    data: {
      employeeId: priya.id,
      startDate: today,
      endDate: today,
      reason: "Personal",
      approved: true,
    },
  });

  console.log("\nSeed complete:", { employees: employees.length, projects: 4 });
  console.log("\n=== TEMPORARY LOGIN CREDENTIALS (share once, then delete this output) ===");
  console.table(credentials);
  console.log("Everyone will be forced to set a new password on first login.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
