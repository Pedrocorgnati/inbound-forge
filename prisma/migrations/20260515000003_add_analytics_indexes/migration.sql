-- CL-177/CL-178 (TASK-11 ST004) — Indexes para performance de analytics
-- ConversionEvent: (lead_id, occurred_at), (channel, occurred_at)
-- UTMLink: (source, created_at)
-- Nota: schema nao tem utm_source em conversion_events nem session_id/visited_at em utm_links;
--       indexes mapeados para colunas equivalentes existentes.

CREATE INDEX IF NOT EXISTS "conversion_event_lead_id_occurred_at_idx"
  ON "conversion_events" ("lead_id", "occurred_at" DESC);

CREATE INDEX IF NOT EXISTS "conversion_event_channel_occurred_at_idx"
  ON "conversion_events" ("channel", "occurred_at" DESC);

CREATE INDEX IF NOT EXISTS "utm_link_source_created_at_idx"
  ON "utm_links" ("source", "created_at" DESC);
