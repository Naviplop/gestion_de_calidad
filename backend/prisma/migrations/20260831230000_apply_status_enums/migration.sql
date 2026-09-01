-- AlterTable
ALTER TABLE "audits" DROP COLUMN "status",
ADD COLUMN     "status" "AuditStatus" NOT NULL DEFAULT 'PLANNED';

-- AlterTable
ALTER TABLE "corrective_actions" DROP COLUMN "status",
ADD COLUMN     "status" "CorrectiveActionStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "nonconformities" DROP COLUMN "status",
ADD COLUMN     "status" "NonconformityStatus" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "risks" DROP COLUMN "status",
ADD COLUMN     "status" "RiskStatus" NOT NULL DEFAULT 'IDENTIFIED';

-- CreateIndex
CREATE INDEX "audits_organizationId_status_idx" ON "audits"("organizationId", "status");

-- CreateIndex
CREATE INDEX "corrective_actions_organizationId_status_idx" ON "corrective_actions"("organizationId", "status");

-- CreateIndex
CREATE INDEX "nonconformities_organizationId_status_idx" ON "nonconformities"("organizationId", "status");

-- CreateIndex
CREATE INDEX "risks_organizationId_status_idx" ON "risks"("organizationId", "status");
