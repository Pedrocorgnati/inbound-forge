-- REMEDIATION-M7-G-004: telemetria de latencia Claude
-- Adiciona coluna duration_ms para registrar latencia por chamada Claude (sonnet/haiku)
ALTER TABLE "api_usage_logs" ADD COLUMN "duration_ms" INTEGER;
