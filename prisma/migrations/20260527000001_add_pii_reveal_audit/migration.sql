-- TAREFA-002 (P0) — PII reveal com motivo, TTL e audit log
-- Tabela de trilha de auditoria para revelacao de PII de leads (LGPD).
-- Idempotente: CREATE TABLE/INDEX IF NOT EXISTS para re-aplicacao segura.
-- SEC-008: nunca armazena o valor revelado, apenas o motivo declarado.

CREATE TABLE IF NOT EXISTS "pii_reveal_audits" (
  "id"             TEXT NOT NULL,
  "lead_id"        TEXT NOT NULL,
  "revealed_by"    VARCHAR(255) NOT NULL,
  "motivo"         TEXT NOT NULL,
  "correlation_id" VARCHAR(36) NOT NULL,
  "ttl_expires_at" TIMESTAMP(3) NOT NULL,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pii_reveal_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_pii_reveal_audit_lead_created"
  ON "pii_reveal_audits" ("lead_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "IDX_pii_reveal_audit_user_created"
  ON "pii_reveal_audits" ("revealed_by", "created_at" DESC);

-- FK para leads com ON DELETE CASCADE (idempotente via guarda no catalogo).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pii_reveal_audits_lead_id_fkey'
  ) THEN
    ALTER TABLE "pii_reveal_audits"
      ADD CONSTRAINT "pii_reveal_audits_lead_id_fkey"
      FOREIGN KEY ("lead_id") REFERENCES "leads"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
