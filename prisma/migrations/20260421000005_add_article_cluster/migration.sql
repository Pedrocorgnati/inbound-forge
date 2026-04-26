-- Intake Review TASK-8 ST002 (CL-159)
CREATE TABLE IF NOT EXISTS "article_clusters" (
  "id"          TEXT         NOT NULL,
  "slug"        VARCHAR(100) NOT NULL,
  "name"        VARCHAR(200) NOT NULL,
  "description" TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "article_clusters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "article_clusters_slug_key" ON "article_clusters"("slug");

ALTER TABLE "blog_articles"
  ADD COLUMN IF NOT EXISTS "cluster_id" TEXT;

CREATE INDEX IF NOT EXISTS "IDX_blog_articles_cluster" ON "blog_articles"("cluster_id");

ALTER TABLE "blog_articles"
  ADD CONSTRAINT "blog_articles_cluster_id_fkey"
  FOREIGN KEY ("cluster_id") REFERENCES "article_clusters"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
