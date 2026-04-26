-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'LOST');

-- CreateEnum
CREATE TYPE "LeadLossReason" AS ENUM ('BUDGET', 'TIMING', 'FIT', 'NO_RESPONSE', 'COMPETITOR', 'OTHER');

-- AlterTable
ALTER TABLE "leads"
  ADD COLUMN "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  ADD COLUMN "loss_reason" "LeadLossReason",
  ADD COLUMN "loss_reason_detail" VARCHAR(500),
  ADD COLUMN "status_updated_at" TIMESTAMP(3);

-- Backfill: mapear funnel_stage para status (best-effort)
UPDATE "leads" SET "status" = 'MQL' WHERE "funnel_stage" = 'AWARENESS';
UPDATE "leads" SET "status" = 'SQL' WHERE "funnel_stage" = 'CONSIDERATION';
UPDATE "leads" SET "status" = 'OPPORTUNITY' WHERE "funnel_stage" = 'DECISION';

-- CreateIndex
CREATE INDEX "IDX_leads_status" ON "leads"("status");
