-- MS13-B002: Adiciona Theme.priorityScore (score composto) separado de
-- Theme.conversionScore (que volta a representar exclusivamente a taxa real CX-01).
--
-- Após esta migração, vigora a convenção:
--   conversionScore = conversions / leads * 100  (atualizado por updateThemeConversionScore)
--   priorityScore   = score composto             (atualizado por ThemeScoringService)
--
-- Backfill: copia o valor atual de conversion_score (que estava sendo sobrescrito pelo
-- composto) para priority_score, preservando o comportamento de ranking de produção até
-- que o serviço de scoring rode novamente com a lógica nova.

ALTER TABLE "Theme"
  ADD COLUMN "priority_score" INTEGER NOT NULL DEFAULT 0;

UPDATE "Theme" SET "priority_score" = "conversion_score";

CREATE INDEX "Theme_priority_score_idx" ON "Theme" ("priority_score");
