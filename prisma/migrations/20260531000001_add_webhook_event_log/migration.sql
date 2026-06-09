-- TAREFA-021 (P2): hardening do webhook Cal.com — dedup + anti-replay.
-- Cria a tabela de log de eventos de webhook com dedup por event_id (SHA-256 do
-- raw body) e correlation_id para rastreabilidade. Migration idempotente
-- (CREATE TABLE / INDEX IF NOT EXISTS) — segura para re-aplicacao.

CREATE TABLE IF NOT EXISTS "webhook_event_logs" (
  "id"                  TEXT NOT NULL,
  "event_id"            VARCHAR(64) NOT NULL,
  "correlation_id"      VARCHAR(36) NOT NULL,
  "source"              VARCHAR(32) NOT NULL DEFAULT 'calcom',
  "trigger_event"       VARCHAR(64) NOT NULL,
  "external_booking_id" VARCHAR(255),
  "payload_timestamp"   TIMESTAMP(3),
  "received_at"         TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "webhook_event_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_webhook_event_logs_event_id"
  ON "webhook_event_logs" ("event_id");

CREATE INDEX IF NOT EXISTS "IDX_webhook_event_logs_received"
  ON "webhook_event_logs" ("received_at");

CREATE INDEX IF NOT EXISTS "IDX_webhook_event_logs_booking"
  ON "webhook_event_logs" ("external_booking_id");
