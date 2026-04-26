-- Intake-Review TASK-3 (CL-030): marcacao anti-bot em runtime no scraping worker
-- Campos distintos de is_protected (INT-093 = seed curadas nao-deletaveis).

ALTER TABLE "sources" ADD COLUMN "anti_bot_blocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sources" ADD COLUMN "anti_bot_reason" VARCHAR(255);
ALTER TABLE "sources" ADD COLUMN "anti_bot_blocked_at" TIMESTAMP(3);
ALTER TABLE "sources" ADD COLUMN "consecutive_failures" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "IDX_sources_active_antibot" ON "sources"("is_active", "anti_bot_blocked");
