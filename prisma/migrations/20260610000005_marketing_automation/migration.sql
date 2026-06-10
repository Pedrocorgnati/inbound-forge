-- Inbound F5: Marketing Automation (trigger -> action). Aditivo.

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('LEAD_CREATED', 'LEAD_STATUS_CHANGED', 'LEAD_MQL');
CREATE TYPE "AutomationActionType" AS ENUM ('NOTIFY', 'SET_FUNNEL_STAGE', 'ENROLL_SEQUENCE');
CREATE TYPE "AutomationRunStatus" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "trigger" "AutomationTrigger" NOT NULL,
    "action_type" "AutomationActionType" NOT NULL,
    "action_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_runs" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "trigger" "AutomationTrigger" NOT NULL,
    "entity_id" TEXT,
    "status" "AutomationRunStatus" NOT NULL,
    "detail" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "automation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IDX_automation_rules_trigger_enabled" ON "automation_rules"("trigger", "enabled");
CREATE INDEX "IDX_automation_runs_rule_created" ON "automation_runs"("rule_id", "created_at");

-- AddForeignKey
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
