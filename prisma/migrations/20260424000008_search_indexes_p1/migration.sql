-- TASK-11 ST001 (CL-TA-041, CL-CS-034) — indices GIN pg_trgm para busca textual.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "idx_lead_name_trgm"
  ON "leads" USING GIN (lower("name") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_lead_company_trgm"
  ON "leads" USING GIN (lower("company") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_content_piece_base_title_trgm"
  ON "content_pieces" USING GIN (lower("base_title") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_content_piece_edited_text_trgm"
  ON "content_pieces" USING GIN (lower("edited_text") gin_trgm_ops);
