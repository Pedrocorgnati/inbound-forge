-- Intake Review TASK-1 (CL-105, CL-106) — Cal.com integration
-- Adiciona valor CALENDAR_BOOKING ao enum ConversionType e campos de reconciliacao
-- (externalBookingId, bookingStatus, utmCampaign) em conversion_events.

-- Postgres nao permite adicionar valor de enum dentro de transacao quando o valor
-- e consumido no mesmo lote. Primeiro adicionamos o valor em statement isolado.
ALTER TYPE "ConversionType" ADD VALUE IF NOT EXISTS 'CALENDAR_BOOKING';

-- Campos opcionais para Cal.com webhook
ALTER TABLE "conversion_events"
  ADD COLUMN IF NOT EXISTS "external_booking_id" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "booking_status" VARCHAR(32),
  ADD COLUMN IF NOT EXISTS "utm_campaign" VARCHAR(255);

-- Unicidade para idempotencia do upsert no webhook
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_conversion_events_external_booking"
  ON "conversion_events" ("external_booking_id")
  WHERE "external_booking_id" IS NOT NULL;

-- Acelera filtro por tipo (ex: lead detail carregando CALENDAR_BOOKING)
CREATE INDEX IF NOT EXISTS "IDX_conversion_events_type"
  ON "conversion_events" ("type");
