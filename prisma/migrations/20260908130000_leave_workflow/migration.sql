CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "LeaveRequest" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'Personal';
ALTER TABLE "LeaveRequest" ADD COLUMN "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "LeaveRequest" ADD COLUMN "reviewedById" TEXT;
ALTER TABLE "LeaveRequest" ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- Existing rows were previously treated as auto-approved.
UPDATE "LeaveRequest" SET "status" = 'APPROVED' WHERE "approved" = true;
UPDATE "LeaveRequest" SET "status" = 'REJECTED' WHERE "approved" = false;

ALTER TABLE "LeaveRequest" DROP COLUMN "approved";

ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
