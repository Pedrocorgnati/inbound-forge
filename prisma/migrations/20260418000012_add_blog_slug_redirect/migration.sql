-- Intake-Review TASK-2 (CL-298): redirect 301 para slugs antigos
-- CreateTable
CREATE TABLE "blog_slug_redirects" (
    "id" TEXT NOT NULL,
    "old_slug" VARCHAR(255) NOT NULL,
    "new_slug" VARCHAR(255) NOT NULL,
    "article_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_slug_redirects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_slug_redirects_old_slug_key" ON "blog_slug_redirects"("old_slug");

-- CreateIndex
CREATE INDEX "IDX_blog_slug_redirects_new" ON "blog_slug_redirects"("new_slug");

-- AddForeignKey
ALTER TABLE "blog_slug_redirects" ADD CONSTRAINT "blog_slug_redirects_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "blog_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
