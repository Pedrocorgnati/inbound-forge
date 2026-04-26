-- Intake-Review TASK-6 (CL-190): quota de regeneracoes por tema
ALTER TABLE "themes" ADD COLUMN "regeneration_count" INTEGER NOT NULL DEFAULT 0;
