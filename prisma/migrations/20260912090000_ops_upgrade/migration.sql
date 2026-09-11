CREATE TYPE "MilestoneStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "LeavePeriod" AS ENUM ('MONTHLY', 'ANNUAL');

-- Task lifecycle acknowledgment
ALTER TABLE "Task" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "acceptedAt" TIMESTAMP(3);

CREATE TABLE "TaskComment" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TaskComment_taskId_idx" ON "TaskComment"("taskId");
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DailyWorkUpdate" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "completed" TEXT,
  "inProgress" TEXT,
  "blocked" TEXT,
  "tomorrow" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyWorkUpdate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DailyWorkUpdate_employeeId_date_key" ON "DailyWorkUpdate"("employeeId", "date");
ALTER TABLE "DailyWorkUpdate" ADD CONSTRAINT "DailyWorkUpdate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationParticipant" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3),
  CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_employeeId_key" ON "ConversationParticipant"("conversationId", "employeeId");
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LeavePolicy" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "period" "LeavePeriod" NOT NULL DEFAULT 'ANNUAL',
  "monthlyAllowance" INTEGER,
  "annualAllowance" INTEGER,
  "carryForward" BOOLEAN NOT NULL DEFAULT false,
  "maxCarryForward" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeavePolicy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LeavePolicy_name_key" ON "LeavePolicy"("name");
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AttendanceConfig" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "officeStartTime" TEXT NOT NULL DEFAULT '09:30',
  "graceMinutes" INTEGER NOT NULL DEFAULT 15,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AttendanceConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Milestone" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "startDate" TIMESTAMP(3),
  "dueDate" TIMESTAMP(3),
  "status" "MilestoneStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default leave policies and attendance config so the new features
-- have sane defaults out of the box (Owner can edit via Settings).
INSERT INTO "LeavePolicy" ("id", "name", "period", "annualAllowance", "carryForward", "updatedAt")
VALUES
  ('leavepolicy_casual', 'Casual Leave', 'ANNUAL', 12, false, CURRENT_TIMESTAMP),
  ('leavepolicy_sick', 'Sick Leave', 'ANNUAL', 6, false, CURRENT_TIMESTAMP);

INSERT INTO "AttendanceConfig" ("id", "officeStartTime", "graceMinutes", "updatedAt")
VALUES ('singleton', '09:30', 15, CURRENT_TIMESTAMP);
