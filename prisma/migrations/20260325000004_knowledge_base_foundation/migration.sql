-- Migration: knowledge_base_foundation
-- Adds isDraft and lastAutosave to case_library_entries
-- for autosave functionality in module-5-knowledge-base

ALTER TABLE "case_library_entries"
  ADD COLUMN "is_draft" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "last_autosave" TIMESTAMP(3);
