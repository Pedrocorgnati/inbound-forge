-- Intake-Review TASK-22 ST001 (CL-PB-052/053, CL-CG-037, CL-TH-054/055) —
-- indices GIN pg_trgm para busca textual nas 5 entidades restantes.
-- pg_trgm ja criado em 20260424000008_search_indexes_p1.

CREATE INDEX IF NOT EXISTS "idx_post_caption_trgm"
  ON "posts" USING GIN (lower("caption") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_blog_article_title_trgm"
  ON "blog_articles" USING GIN (lower("title") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_blog_article_slug_trgm"
  ON "blog_articles" USING GIN (lower("slug") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_blog_article_body_trgm"
  ON "blog_articles" USING GIN (lower("body") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_visual_asset_file_name_trgm"
  ON "visual_assets" USING GIN (lower("file_name") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_visual_asset_original_name_trgm"
  ON "visual_assets" USING GIN (lower("original_name") gin_trgm_ops);

-- tags e String[] — indexar como array
CREATE INDEX IF NOT EXISTS "idx_visual_asset_tags_gin"
  ON "visual_assets" USING GIN ("tags");

CREATE INDEX IF NOT EXISTS "idx_pain_library_title_trgm"
  ON "pain_library_entries" USING GIN (lower("title") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_pain_library_description_trgm"
  ON "pain_library_entries" USING GIN (lower("description") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_solution_pattern_name_trgm"
  ON "solution_patterns" USING GIN (lower("name") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_solution_pattern_description_trgm"
  ON "solution_patterns" USING GIN (lower("description") gin_trgm_ops);
