-- AUDIT-3: corrige drift de schema. As colunas/indices de leads abaixo (M013:
-- leads-conversions) estao declaradas em prisma/schema.prisma mas NENHUMA migration
-- as criava. Sem elas, `prisma migrate deploy` num DB limpo FALHA na migration
-- 20260418000005 (cujo backfill faz UPDATE ... WHERE funnel_stage = ...).
--
-- Ordenacao: o nome "20260418000004b" ordena DEPOIS de "20260418000004_theme..."
-- e ANTES de "20260418000005_lead_status..." (indice 13: '4' < '5'), garantindo que
-- funnel_stage exista quando a 005 rodar.
--
-- Idempotente (IF NOT EXISTS): seguro tanto em DB limpo (cria) quanto em producao
-- onde as colunas ja existem por drift/db-push (no-op). Os enums Channel/FunnelStage
-- ja sao criados pela migration init (20260325000001).

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "channel" "Channel";
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "funnel_stage" "FunnelStage";
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lgpd_consent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lgpd_consent_at" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "first_touch_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "IDX_leads_channel" ON "leads"("channel");
CREATE INDEX IF NOT EXISTS "IDX_leads_funnel_stage" ON "leads"("funnel_stage");
CREATE INDEX IF NOT EXISTS "IDX_leads_first_touch_theme" ON "leads"("first_touch_theme_id");
