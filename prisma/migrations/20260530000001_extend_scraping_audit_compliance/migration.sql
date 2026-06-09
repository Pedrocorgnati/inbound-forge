-- TAREFA-014: campos de auditoria de scraping para compliance operacional.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScrapingRobotsDecision') THEN
    CREATE TYPE "ScrapingRobotsDecision" AS ENUM ('ALLOW', 'DENY');
  END IF;
END
$$;

ALTER TABLE "scraping_audit_logs"
  ADD COLUMN IF NOT EXISTS "robots_decision" "ScrapingRobotsDecision" NOT NULL DEFAULT 'ALLOW',
  ADD COLUMN IF NOT EXISTS "status_code" INTEGER,
  ADD COLUMN IF NOT EXISTS "latency_ms" INTEGER,
  ADD COLUMN IF NOT EXISTS "correlation_id" VARCHAR(36) NOT NULL DEFAULT (gen_random_uuid()::text),
  ADD COLUMN IF NOT EXISTS "revealed_by" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "ttl_expires_at" TIMESTAMP(3) NOT NULL DEFAULT (now() + interval '180 days');

CREATE INDEX IF NOT EXISTS "IDX_scraping_audit_robots_created"
  ON "scraping_audit_logs" ("robots_decision", "created_at");

CREATE INDEX IF NOT EXISTS "IDX_scraping_audit_correlation"
  ON "scraping_audit_logs" ("correlation_id");

CREATE INDEX IF NOT EXISTS "IDX_scraping_audit_ttl"
  ON "scraping_audit_logs" ("ttl_expires_at");
