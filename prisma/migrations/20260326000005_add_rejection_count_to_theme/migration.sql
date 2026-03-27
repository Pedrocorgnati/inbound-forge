-- Migration: add_rejection_count_to_theme
-- Module: module-7-theme-scoring-engine (TASK-7, ST001)
-- RN-006: Score decay após 3 rejeições

ALTER TABLE "themes" ADD COLUMN "rejection_count" INTEGER NOT NULL DEFAULT 0;
