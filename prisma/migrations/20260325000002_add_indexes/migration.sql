-- Migration M009: Performance Indexes
-- Criado por: auto-flow execute (module-1/TASK-1/ST005)
-- Rollback: DROP INDEX statements ao final deste arquivo

-- Indexes de performance adicionais (complementam os definidos no schema)
-- Nota: Índices no schema foram criados na migration M001. Aqui adicionamos
-- índices compostos e de cobertura para queries frequentes.

CREATE INDEX IF NOT EXISTS "IDX_content_piece_status_theme"
    ON "content_pieces"("status", "theme_id");

CREATE INDEX IF NOT EXISTS "IDX_post_published_at"
    ON "posts"("published_at") WHERE "published_at" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "IDX_lead_created_at"
    ON "leads"("created_at");

CREATE INDEX IF NOT EXISTS "IDX_api_usage_log_recorded_at"
    ON "api_usage_logs"("recorded_at");

CREATE INDEX IF NOT EXISTS "IDX_alert_log_created_at"
    ON "alert_logs"("created_at");

CREATE INDEX IF NOT EXISTS "IDX_scraped_text_created_at"
    ON "scraped_texts"("created_at") WHERE "classified" = FALSE;

-- Rollback:
-- DROP INDEX IF EXISTS "IDX_scraped_text_created_at";
-- DROP INDEX IF EXISTS "IDX_alert_log_created_at";
-- DROP INDEX IF EXISTS "IDX_api_usage_log_recorded_at";
-- DROP INDEX IF EXISTS "IDX_lead_created_at";
-- DROP INDEX IF EXISTS "IDX_post_published_at";
-- DROP INDEX IF EXISTS "IDX_content_piece_status_theme";
