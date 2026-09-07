import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import "dotenv/config";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

async function main() {
  await prisma.task.deleteMany();
  await prisma.projectAssignment.deleteMany();
  await prisma.project.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.employee.deleteMany();

  const colors = ["#6366f1", "#0ea5e9", "#f97316", "#10b981", "#ec4899", "#a855f7"];

  const employees = await Promise.all(
    [
      { name: "Kishore", email: "clickfieldai@gmail.com", title: "Founder", department: "Leadership", githubUsername: "kishore-x", claudeAccountLabel: "kishore-primary", vercelUsername: "kishore-x" },
      { name: "Ananya Rao", email: "ananya@clickfieldai.com", title: "Full-stack Developer", department: "Engineering", githubUsername: "ananya-dev", claudeAccountLabel: "eng-seat-1", vercelUsername: "ananya-rao" },
      { name: "Rahul Mehta", email: "rahul@clickfieldai.com", title: "Frontend Developer", department: "Engineering", githubUsername: "rahulm", claudeAccountLabel: "eng-seat-2", vercelUsername: "rahul-mehta" },
      { name: "Priya Nair", email: "priya@clickfieldai.com", title: "UI/UX Designer", department: "Design", githubUsername: "priyan", claudeAccountLabel: "design-seat-1", vercelUsername: "priya-nair" },
      { name: "Vikram Singh", email: "vikram@clickfieldai.com", title: "Backend Developer", department: "Engineering", githubUsername: "vikrams", claudeAccountLabel: "eng-seat-3", vercelUsername: "vikram-singh" },
      { name: "Sneha Iyer", email: "sneha@clickfieldai.com", title: "Project Manager", department: "Operations", githubUsername: "sneha-i", claudeAccountLabel: "ops-seat-1", vercelUsername: null },
    ].map((e, i) =>
      prisma.employee.create({
        data: { ...e, avatarColor: colors[i % colors.length] },
      })
    )
  );

  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: "Eng Data Analyzer",
        client: "Internal Product",
        description: "Manufacturing data analysis dashboard demo",
        stage: "DEVELOPMENT",
        progress: 65,
        deadline: new Date("2026-09-30"),
        githubRepoUrl: "https://github.com/clickfieldai/eng-data-analyzer",
        vercelProjectUrl: "https://vercel.com/clickfieldai/eng-data-analyzer",
      },
    }),
    prisma.project.create({
      data: {
        name: "TOSTEM Website Revamp",
        client: "TOSTEM",
        description: "Corporate site redesign and rebuild",
        stage: "TESTING",
        progress: 85,
        deadline: new Date("2026-09-20"),
        githubRepoUrl: "https://github.com/clickfieldai/tostem-site",
        vercelProjectUrl: "https://vercel.com/clickfieldai/tostem-site",
      },
    }),
    prisma.project.create({
      data: {
        name: "Lane Fertility Dashboard",
        client: "Lane Fertility",
        description: "Patient analytics dashboard",
        stage: "DEPLOYED",
        progress: 100,
        deadline: new Date("2026-08-01"),
        githubRepoUrl: "https://github.com/clickfieldai/lane-fertility-dashboard",
        vercelProjectUrl: "https://vercel.com/clickfieldai/lane-fertility-dashboard",
      },
    }),
    prisma.project.create({
      data: {
        name: "LinkedIn Lead Qualification Agent",
        client: "Internal Product",
        description: "AI agent system to qualify inbound LinkedIn leads",
        stage: "PLANNING",
        progress: 15,
        deadline: new Date("2026-11-01"),
        githubRepoUrl: null,
        vercelProjectUrl: null,
      },
    }),
  ]);

  const [dataAnalyzer, tostem, laneFertility, leadAgent] = projects;
  const [kishore, ananya, rahul, priya, vikram, sneha] = employees;

  await prisma.projectAssignment.createMany({
    data: [
      { projectId: dataAnalyzer.id, employeeId: kishore.id, role: "LEAD" },
      { projectId: dataAnalyzer.id, employeeId: vikram.id, role: "DEVELOPER" },
      { projectId: dataAnalyzer.id, employeeId: ananya.id, role: "DEVELOPER" },

      { projectId: tostem.id, employeeId: rahul.id, role: "LEAD" },
      { projectId: tostem.id, employeeId: priya.id, role: "DESIGNER" },
      { projectId: tostem.id, employeeId: sneha.id, role: "QA" },

      { projectId: laneFertility.id, employeeId: ananya.id, role: "LEAD" },

      { projectId: leadAgent.id, employeeId: kishore.id, role: "LEAD" },
      { projectId: leadAgent.id, employeeId: vikram.id, role: "CONTRIBUTOR" },
    ],
  });

  await prisma.task.createMany({
    data: [
      { projectId: dataAnalyzer.id, title: "Wire up CSV ingestion", status: "DONE" },
      { projectId: dataAnalyzer.id, title: "Build anomaly detection view", status: "IN_PROGRESS" },
      { projectId: dataAnalyzer.id, title: "Deploy staging build", status: "TODO" },
      { projectId: tostem.id, title: "Cross-browser QA pass", status: "IN_PROGRESS" },
      { projectId: tostem.id, title: "Client sign-off", status: "TODO" },
      { projectId: leadAgent.id, title: "Define ICP scoring rubric", status: "TODO" },
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

  console.log("Seed complete:", {
    employees: employees.length,
    projects: projects.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
