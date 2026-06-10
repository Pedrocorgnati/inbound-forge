-- Inbound F3: Lead Scoring. Aditivo.

-- AlterTable
ALTER TABLE "leads" ADD COLUMN "score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "leads" ADD COLUMN "score_updated_at" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN "mql_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "lead_score_events" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "new_total" INTEGER NOT NULL,
    "reason" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_score_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IDX_leads_score" ON "leads"("score");
CREATE INDEX "IDX_lead_score_events_lead_created" ON "lead_score_events"("lead_id", "created_at");

-- AddForeignKey
ALTER TABLE "lead_score_events" ADD CONSTRAINT "lead_score_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
