-- TAREFA-005 (P0) - formulario publico /diagnostico com consentimento LGPD.
-- Idempotente para reexecucao segura em ambientes ja parcialmente migrados.

CREATE TABLE IF NOT EXISTS "diagnostico_leads" (
  "id" TEXT NOT NULL,
  "correlation_id" VARCHAR(36) NOT NULL,
  "encrypted_payload" TEXT NOT NULL,
  "raw_text" TEXT,
  "raw_text_expires_at" TIMESTAMP(3) NOT NULL,
  "segment" VARCHAR(120) NOT NULL,
  "lgpd_consent" BOOLEAN NOT NULL DEFAULT false,
  "lgpd_consent_at" TIMESTAMP(3) NOT NULL,
  "source_ip_hash" VARCHAR(64),
  "user_agent" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "diagnostico_leads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "diagnostico_leads_correlation_id_key"
  ON "diagnostico_leads" ("correlation_id");

CREATE INDEX IF NOT EXISTS "IDX_diagnostico_leads_created"
  ON "diagnostico_leads" ("created_at");

CREATE INDEX IF NOT EXISTS "IDX_diagnostico_leads_raw_text_expires"
  ON "diagnostico_leads" ("raw_text_expires_at");

CREATE INDEX IF NOT EXISTS "IDX_diagnostico_leads_segment_created"
  ON "diagnostico_leads" ("segment", "created_at");

