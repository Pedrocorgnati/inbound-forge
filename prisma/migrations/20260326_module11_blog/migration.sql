-- Migration: module11_blog
-- Adiciona campos faltantes a blog_articles e blog_article_versions
-- Rastreabilidade: TASK-0 ST002, FEAT-publishing-blog-001, FEAT-publishing-blog-005, FEAT-publishing-blog-006
--
-- PRE-CHECK (rodar antes de aplicar):
-- SELECT slug, count(*) FROM blog_articles GROUP BY slug HAVING count(*) > 1;
-- Resultado esperado: 0 linhas (sem slugs duplicados)

BEGIN;

-- ─── 1. Adicionar ARCHIVED ao enum ArticleStatus ────────────────────────────
-- Nota: ADD VALUE não pode rodar dentro de transação em PostgreSQL <= 11
-- Em PostgreSQL 12+: funciona dentro de BEGIN/COMMIT
ALTER TYPE "ArticleStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

COMMIT;

BEGIN;

-- ─── 2. Adicionar colunas a blog_articles ───────────────────────────────────
ALTER TABLE "blog_articles"
  ADD COLUMN IF NOT EXISTS "cover_image_alt" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "canonical_url" VARCHAR(512),
  ADD COLUMN IF NOT EXISTS "schema_types" TEXT[] NOT NULL DEFAULT ARRAY['BlogPosting'],
  ADD COLUMN IF NOT EXISTS "hreflang" JSONB,
  ADD COLUMN IF NOT EXISTS "author_name" VARCHAR(255) NOT NULL DEFAULT 'Pedro Corgnati',
  ADD COLUMN IF NOT EXISTS "cta_type" "CTADestination",
  ADD COLUMN IF NOT EXISTS "cta_url" VARCHAR(512),
  ADD COLUMN IF NOT EXISTS "cta_label" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "current_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "approved_by" VARCHAR(255);

-- Tornar meta_title e meta_description anuláveis (eram NOT NULL)
ALTER TABLE "blog_articles"
  ALTER COLUMN "meta_title" DROP NOT NULL,
  ALTER COLUMN "meta_description" DROP NOT NULL;

-- ─── 3. Adicionar colunas a blog_article_versions ───────────────────────────
ALTER TABLE "blog_article_versions"
  ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';

-- Adicionar unique constraint (articleId, versionNumber)
ALTER TABLE "blog_article_versions"
  DROP CONSTRAINT IF EXISTS "UQ_blog_article_versions_article_version",
  ADD CONSTRAINT "UQ_blog_article_versions_article_version"
    UNIQUE ("article_id", "version_number");

-- ─── 4. Índices adicionais ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "IDX_blog_articles_published_at"
  ON "blog_articles" ("published_at" DESC)
  WHERE "status" = 'PUBLISHED';

COMMIT;
