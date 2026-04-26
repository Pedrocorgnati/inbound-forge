-- Intake-Review TASK-1 (CL-TA-036, CL-OP-018, CL-TH-031): adiciona LEGAL_HOLD
-- ao enum LeadStatus para permitir exclusao do ciclo de purga LGPD (2 anos)
-- quando existir hold juridico sobre o lead.
--
-- Uso: leads com status=LEGAL_HOLD NAO sao purgados pelo cron
-- /api/cron/lgpd-purge (src/lib/services/lgpd-purge.service.ts).
-- A transicao para LEGAL_HOLD e manual via operador ou order judicial.

ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'LEGAL_HOLD';
