-- Module-15: onboarding_completed field on operators
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;
