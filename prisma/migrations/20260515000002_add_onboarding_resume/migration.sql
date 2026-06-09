-- Migration: CL-249 (TASK-12 ST001) — Onboarding skip + resume
-- Adiciona campos de progresso e skip ao model Operator

ALTER TABLE "operators"
  ADD COLUMN IF NOT EXISTS "onboarding_step"         INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "onboarding_skipped_at"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "onboarding_completed_at" TIMESTAMP(3);
