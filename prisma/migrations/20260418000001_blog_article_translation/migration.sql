-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TranslationSource" AS ENUM ('MACHINE', 'HUMAN');

-- CreateTable
CREATE TABLE "blog_article_translations" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "meta_title" VARCHAR(70),
    "meta_description" VARCHAR(160),
    "excerpt" VARCHAR(500),
    "content_md" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
    "translated_by" "TranslationSource" NOT NULL DEFAULT 'MACHINE',
    "cost_usd" DECIMAL(10,4),
    "tokens_used" INTEGER,
    "rejection_reason" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_article_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UQ_blog_article_translations_article_locale" ON "blog_article_translations"("article_id", "locale");

-- CreateIndex
CREATE INDEX "IDX_blog_article_translations_locale_status" ON "blog_article_translations"("locale", "status");

-- AddForeignKey
ALTER TABLE "blog_article_translations" ADD CONSTRAINT "blog_article_translations_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "blog_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
