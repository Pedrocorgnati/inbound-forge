-- TASK-11 ST004 (CL-064): rate-limit configuravel por fonte
ALTER TABLE "sources"
  ADD COLUMN "rate_limit_per_minute" INTEGER NOT NULL DEFAULT 60;
