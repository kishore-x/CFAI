-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN     "lastEmailedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "deadlineReminderStage" TEXT;

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "taskAssigned" BOOLEAN NOT NULL DEFAULT true,
    "taskCompleted" BOOLEAN NOT NULL DEFAULT true,
    "taskBlocked" BOOLEAN NOT NULL DEFAULT true,
    "clarificationRequested" BOOLEAN NOT NULL DEFAULT true,
    "leaveRequested" BOOLEAN NOT NULL DEFAULT true,
    "leaveApproved" BOOLEAN NOT NULL DEFAULT true,
    "leaveRejected" BOOLEAN NOT NULL DEFAULT true,
    "newMessage" BOOLEAN NOT NULL DEFAULT true,
    "dailyWorkUpdate" BOOLEAN NOT NULL DEFAULT true,
    "deadlineReminder" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_employeeId_key" ON "NotificationPreference"("employeeId");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
