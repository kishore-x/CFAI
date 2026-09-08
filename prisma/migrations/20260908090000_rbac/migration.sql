-- New enums
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'COMPLETED');

-- Project: drop old stage/progress, add new columns
ALTER TABLE "Project" DROP COLUMN "stage";
ALTER TABLE "Project" DROP COLUMN "progress";
DROP TYPE "ProjectStage";

ALTER TABLE "Project" ADD COLUMN "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING';
ALTER TABLE "Project" ADD COLUMN "progressOverride" INTEGER;
ALTER TABLE "Project" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "managerId" TEXT;
ALTER TABLE "Project" ADD CONSTRAINT "Project_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ProjectAssignment: soft-removal support
ALTER TABLE "ProjectAssignment" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ProjectAssignment" ADD COLUMN "removedAt" TIMESTAMP(3);

-- Task: drop old freeform status, rebuild with typed columns
ALTER TABLE "Task" DROP COLUMN "status";
ALTER TABLE "Task" ADD COLUMN "status" "TaskStatus" NOT NULL DEFAULT 'TODO';
ALTER TABLE "Task" ADD COLUMN "description" TEXT;
ALTER TABLE "Task" ADD COLUMN "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "Task" ADD COLUMN "dueDate" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "assignedToId" TEXT;
ALTER TABLE "Task" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Task" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing seeded tasks have no creator; backfill from the project's manager
-- or first assignment lead, falling back to any employee, before enforcing NOT NULL.
UPDATE "Task" t
SET "createdById" = COALESCE(
  (SELECT p."managerId" FROM "Project" p WHERE p.id = t."projectId"),
  (SELECT e.id FROM "Employee" e ORDER BY e."createdAt" LIMIT 1)
);
ALTER TABLE "Task" ALTER COLUMN "createdById" SET NOT NULL;

ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ActivityLog
CREATE TABLE "ActivityLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");
CREATE INDEX "ActivityLog_actorId_idx" ON "ActivityLog"("actorId");
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
