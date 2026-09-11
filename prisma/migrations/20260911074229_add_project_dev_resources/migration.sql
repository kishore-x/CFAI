-- CreateEnum
CREATE TYPE "DevResourceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "claudeAccountName" TEXT,
ADD COLUMN     "devResourceStatus" "DevResourceStatus",
ADD COLUMN     "developmentBranch" TEXT,
ADD COLUMN     "productionUrl" TEXT,
ADD COLUMN     "stagingUrl" TEXT,
ADD COLUMN     "techStack" TEXT;

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "updatedAt" DROP DEFAULT;
