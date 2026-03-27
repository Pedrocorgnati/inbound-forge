-- Migration M001-M008: Inbound Forge — Initial Schema
-- Criado por: auto-flow execute (module-1/TASK-1/ST005)
-- Rollback: DROP TABLE statements ao final deste arquivo

-- ─── Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE "UserRole" AS ENUM ('OPERATOR');
CREATE TYPE "EntryStatus" AS ENUM ('DRAFT', 'VALIDATED');
CREATE TYPE "ThemeStatus" AS ENUM ('ACTIVE', 'DEPRIORITIZED', 'REJECTED');
CREATE TYPE "ContentAngle" AS ENUM ('AGGRESSIVE', 'CONSULTIVE', 'AUTHORIAL');
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'FAILED', 'PENDING_ART');
CREATE TYPE "Channel" AS ENUM ('BLOG', 'LINKEDIN', 'INSTAGRAM');
CREATE TYPE "WorkerStatus" AS ENUM ('ACTIVE', 'IDLE', 'ERROR');
CREATE TYPE "WorkerType" AS ENUM ('SCRAPING', 'IMAGE', 'PUBLISHING');
CREATE TYPE "ConversionType" AS ENUM ('CONVERSATION', 'MEETING', 'PROPOSAL');
CREATE TYPE "AttributionType" AS ENUM ('FIRST_TOUCH', 'ASSISTED_TOUCH');
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED');
CREATE TYPE "FunnelStage" AS ENUM ('AWARENESS', 'CONSIDERATION', 'DECISION');
CREATE TYPE "ImageType" AS ENUM ('CAROUSEL', 'STATIC');
CREATE TYPE "CTADestination" AS ENUM ('WHATSAPP', 'BLOG', 'CONTACT_FORM');

-- ─── M001: Skeleton (Operator + WorkerHealth) ────────────────────────────────

CREATE TABLE "operators" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "email" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "operators_email_key" ON "operators"("email");

CREATE TABLE "worker_healths" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "type" "WorkerType" NOT NULL,
    "status" "WorkerStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_heartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "worker_healths_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "worker_healths_type_key" ON "worker_healths"("type");
CREATE INDEX "IDX_worker_healths_type" ON "worker_healths"("type");

-- ─── M002: Rock 1 — Knowledge Base ──────────────────────────────────────────

CREATE TABLE "case_library_entries" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "name" VARCHAR(255) NOT NULL,
    "sector" VARCHAR(100) NOT NULL,
    "system_type" VARCHAR(100) NOT NULL,
    "outcome" TEXT NOT NULL,
    "has_quantifiable_result" BOOLEAN NOT NULL DEFAULT FALSE,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "case_library_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_case_library_status" ON "case_library_entries"("status");

CREATE TABLE "pain_library_entries" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "sectors" TEXT[] NOT NULL DEFAULT '{}',
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pain_library_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_pain_library_status" ON "pain_library_entries"("status");

CREATE TABLE "case_pains" (
    "case_id" TEXT NOT NULL,
    "pain_id" TEXT NOT NULL,
    CONSTRAINT "case_pains_pkey" PRIMARY KEY ("case_id", "pain_id")
);

ALTER TABLE "case_pains" ADD CONSTRAINT "case_pains_case_id_fkey"
    FOREIGN KEY ("case_id") REFERENCES "case_library_entries"("id") ON DELETE CASCADE;
ALTER TABLE "case_pains" ADD CONSTRAINT "case_pains_pain_id_fkey"
    FOREIGN KEY ("pain_id") REFERENCES "pain_library_entries"("id") ON DELETE CASCADE;

CREATE TABLE "solution_patterns" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "pain_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "solution_patterns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_solution_patterns_pain" ON "solution_patterns"("pain_id");
CREATE INDEX "IDX_solution_patterns_case" ON "solution_patterns"("case_id");

ALTER TABLE "solution_patterns" ADD CONSTRAINT "solution_patterns_pain_id_fkey"
    FOREIGN KEY ("pain_id") REFERENCES "pain_library_entries"("id");
ALTER TABLE "solution_patterns" ADD CONSTRAINT "solution_patterns_case_id_fkey"
    FOREIGN KEY ("case_id") REFERENCES "case_library_entries"("id");

CREATE TABLE "objections" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "content" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "objections_pkey" PRIMARY KEY ("id")
);

-- ─── M003: Rock 1 — Niche + Scraping + Theme ─────────────────────────────────

CREATE TABLE "niche_opportunities" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "sector" VARCHAR(100) NOT NULL,
    "pain_category" VARCHAR(255) NOT NULL,
    "potential_score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "niche_opportunities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "scraped_texts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "source" VARCHAR(512) NOT NULL,
    "raw_text" TEXT NOT NULL,
    "classified" BOOLEAN NOT NULL DEFAULT FALSE,
    "classified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scraped_texts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_scraped_texts_classified" ON "scraped_texts"("classified");

CREATE TABLE "themes" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "title" VARCHAR(500) NOT NULL,
    "opportunity_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ThemeStatus" NOT NULL DEFAULT 'ACTIVE',
    "rejection_reason" TEXT,
    "is_new" BOOLEAN NOT NULL DEFAULT TRUE,
    "pain_id" TEXT,
    "case_id" TEXT,
    "solution_pattern_id" TEXT,
    "niche_opportunity_id" TEXT,
    "conversion_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_themes_status_score" ON "themes"("status", "opportunity_score" DESC);
CREATE INDEX "IDX_themes_is_new" ON "themes"("is_new");

ALTER TABLE "themes" ADD CONSTRAINT "themes_pain_id_fkey"
    FOREIGN KEY ("pain_id") REFERENCES "pain_library_entries"("id");
ALTER TABLE "themes" ADD CONSTRAINT "themes_case_id_fkey"
    FOREIGN KEY ("case_id") REFERENCES "case_library_entries"("id");
ALTER TABLE "themes" ADD CONSTRAINT "themes_solution_pattern_id_fkey"
    FOREIGN KEY ("solution_pattern_id") REFERENCES "solution_patterns"("id");
ALTER TABLE "themes" ADD CONSTRAINT "themes_niche_opportunity_id_fkey"
    FOREIGN KEY ("niche_opportunity_id") REFERENCES "niche_opportunities"("id");

-- ─── M004: Rock 2 — Content ──────────────────────────────────────────────────

CREATE TABLE "image_jobs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "content_piece_id" TEXT NOT NULL,
    "template_type" "ImageType" NOT NULL,
    "provider" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "background_url" VARCHAR(512),
    "output_url" VARCHAR(512),
    "processing_ms" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "image_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "image_jobs_content_piece_id_key" ON "image_jobs"("content_piece_id");
CREATE INDEX "IDX_image_jobs_status" ON "image_jobs"("status");

CREATE TABLE "content_pieces" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "theme_id" TEXT NOT NULL,
    "base_title" VARCHAR(500) NOT NULL,
    "pain_category" VARCHAR(255) NOT NULL,
    "target_niche" VARCHAR(255) NOT NULL,
    "related_service" VARCHAR(255) NOT NULL,
    "funnel_stage" "FunnelStage" NOT NULL,
    "ideal_format" VARCHAR(50) NOT NULL,
    "recommended_channel" "Channel" NOT NULL,
    "cta_destination" "CTADestination" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "selected_angle" "ContentAngle",
    "edited_text" TEXT,
    "generated_image_url" VARCHAR(512),
    "image_job_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_pieces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "content_pieces_image_job_id_key" ON "content_pieces"("image_job_id");
CREATE INDEX "IDX_content_pieces_theme" ON "content_pieces"("theme_id");
CREATE INDEX "IDX_content_pieces_status" ON "content_pieces"("status");

ALTER TABLE "content_pieces" ADD CONSTRAINT "content_pieces_theme_id_fkey"
    FOREIGN KEY ("theme_id") REFERENCES "themes"("id");
ALTER TABLE "content_pieces" ADD CONSTRAINT "content_pieces_image_job_id_fkey"
    FOREIGN KEY ("image_job_id") REFERENCES "image_jobs"("id");

ALTER TABLE "image_jobs" ADD CONSTRAINT "image_jobs_content_piece_id_fkey"
    FOREIGN KEY ("content_piece_id") REFERENCES "content_pieces"("id");

CREATE TABLE "content_angle_variants" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "piece_id" TEXT NOT NULL,
    "angle" "ContentAngle" NOT NULL,
    "text" TEXT NOT NULL,
    "recommended_cta" TEXT NOT NULL,
    "suggested_channel" "Channel" NOT NULL,
    "is_selected" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_angle_variants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_content_angle_variants_piece" ON "content_angle_variants"("piece_id");

ALTER TABLE "content_angle_variants" ADD CONSTRAINT "content_angle_variants_piece_id_fkey"
    FOREIGN KEY ("piece_id") REFERENCES "content_pieces"("id") ON DELETE CASCADE;

CREATE TABLE "content_rejections" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "piece_id" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_rejections_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "content_rejections" ADD CONSTRAINT "content_rejections_piece_id_fkey"
    FOREIGN KEY ("piece_id") REFERENCES "content_pieces"("id") ON DELETE CASCADE;

-- ─── M005: Rock 3 — Visual Assets ────────────────────────────────────────────

CREATE TABLE "visual_assets" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "storage_url" VARCHAR(512) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "visual_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "image_templates" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "image_type" "ImageType" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "image_templates_pkey" PRIMARY KEY ("id")
);

-- ─── M006: Rock 4 — Publishing ───────────────────────────────────────────────

CREATE TABLE "posts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "content_piece_id" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),
    "image_url" VARCHAR(512),
    "caption" TEXT NOT NULL,
    "hashtags" TEXT[] NOT NULL DEFAULT '{}',
    "cta" TEXT NOT NULL,
    "tracking_url" VARCHAR(1024),
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "posts_content_piece_id_key" ON "posts"("content_piece_id");
CREATE INDEX "IDX_posts_channel_status" ON "posts"("channel", "status");
CREATE INDEX "IDX_posts_scheduled_at" ON "posts"("scheduled_at");

ALTER TABLE "posts" ADD CONSTRAINT "posts_content_piece_id_fkey"
    FOREIGN KEY ("content_piece_id") REFERENCES "content_pieces"("id");

CREATE TABLE "publishing_queue" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "post_id" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "next_attempt_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "publishing_queue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "publishing_queue_post_id_key" ON "publishing_queue"("post_id");

ALTER TABLE "publishing_queue" ADD CONSTRAINT "publishing_queue_post_id_fkey"
    FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;

CREATE TABLE "blog_articles" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "content_piece_id" TEXT,
    "slug" VARCHAR(255) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "excerpt" VARCHAR(500) NOT NULL,
    "body" TEXT NOT NULL,
    "featured_image_url" VARCHAR(512),
    "meta_title" VARCHAR(70) NOT NULL,
    "meta_description" VARCHAR(160) NOT NULL,
    "tags" TEXT[] NOT NULL DEFAULT '{}',
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "json_ld" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blog_articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "blog_articles_content_piece_id_key" ON "blog_articles"("content_piece_id");
CREATE UNIQUE INDEX "blog_articles_slug_key" ON "blog_articles"("slug");
CREATE INDEX "IDX_blog_articles_status" ON "blog_articles"("status", "published_at");
CREATE INDEX "IDX_blog_articles_slug" ON "blog_articles"("slug");

ALTER TABLE "blog_articles" ADD CONSTRAINT "blog_articles_content_piece_id_fkey"
    FOREIGN KEY ("content_piece_id") REFERENCES "content_pieces"("id");

CREATE TABLE "blog_article_versions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "article_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "change_note" VARCHAR(500),
    "version_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blog_article_versions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "blog_article_versions" ADD CONSTRAINT "blog_article_versions_article_id_fkey"
    FOREIGN KEY ("article_id") REFERENCES "blog_articles"("id") ON DELETE CASCADE;

-- ─── M007: Rock 5 — Lead Conversion ─────────────────────────────────────────

CREATE TABLE "leads" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "name" VARCHAR(255),
    "company" VARCHAR(255),
    "contact_info" TEXT, -- PII: encrypted via COMP-002
    "first_touch_post_id" TEXT NOT NULL,
    "first_touch_theme_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_leads_first_touch_post" ON "leads"("first_touch_post_id");

ALTER TABLE "leads" ADD CONSTRAINT "leads_first_touch_post_id_fkey"
    FOREIGN KEY ("first_touch_post_id") REFERENCES "posts"("id");
ALTER TABLE "leads" ADD CONSTRAINT "leads_first_touch_theme_id_fkey"
    FOREIGN KEY ("first_touch_theme_id") REFERENCES "themes"("id");

CREATE TABLE "conversion_events" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "lead_id" TEXT NOT NULL,
    "type" "ConversionType" NOT NULL,
    "attribution" "AttributionType" NOT NULL DEFAULT 'FIRST_TOUCH',
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversion_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_conversion_events_lead" ON "conversion_events"("lead_id");

ALTER TABLE "conversion_events" ADD CONSTRAINT "conversion_events_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE;

CREATE TABLE "utm_links" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "post_id" TEXT NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "medium" VARCHAR(50) NOT NULL,
    "campaign" VARCHAR(255) NOT NULL,
    "content" VARCHAR(255) NOT NULL,
    "full_url" VARCHAR(1024) NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "utm_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "utm_links_post_id_key" ON "utm_links"("post_id");

ALTER TABLE "utm_links" ADD CONSTRAINT "utm_links_post_id_fkey"
    FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;

CREATE TABLE "reconciliation_items" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "type" VARCHAR(50) NOT NULL,
    "post_id" TEXT,
    "lead_id" TEXT,
    "week_of" TIMESTAMP(3) NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT FALSE,
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reconciliation_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_reconciliation_items_status" ON "reconciliation_items"("resolved", "week_of");

ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "leads"("id");

-- ─── M008: Rock 6 — API Monitoring ───────────────────────────────────────────

-- Retention: 90 days (COMP-004)
CREATE TABLE "api_usage_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "service" VARCHAR(50) NOT NULL,
    "metric" VARCHAR(50) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_api_usage_logs_service" ON "api_usage_logs"("service", "recorded_at");

-- Retention: 30 days (COMP-004)
CREATE TABLE "alert_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "message" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT FALSE,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alert_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_alert_logs_status" ON "alert_logs"("resolved", "created_at");

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- Para rollback completo, executar na ordem inversa:
-- DROP TABLE IF EXISTS "alert_logs" CASCADE;
-- DROP TABLE IF EXISTS "api_usage_logs" CASCADE;
-- DROP TABLE IF EXISTS "reconciliation_items" CASCADE;
-- DROP TABLE IF EXISTS "utm_links" CASCADE;
-- DROP TABLE IF EXISTS "conversion_events" CASCADE;
-- DROP TABLE IF EXISTS "leads" CASCADE;
-- DROP TABLE IF EXISTS "blog_article_versions" CASCADE;
-- DROP TABLE IF EXISTS "blog_articles" CASCADE;
-- DROP TABLE IF EXISTS "publishing_queue" CASCADE;
-- DROP TABLE IF EXISTS "posts" CASCADE;
-- DROP TABLE IF EXISTS "image_templates" CASCADE;
-- DROP TABLE IF EXISTS "visual_assets" CASCADE;
-- DROP TABLE IF EXISTS "content_rejections" CASCADE;
-- DROP TABLE IF EXISTS "content_angle_variants" CASCADE;
-- DROP TABLE IF EXISTS "content_pieces" CASCADE;
-- DROP TABLE IF EXISTS "image_jobs" CASCADE;
-- DROP TABLE IF EXISTS "themes" CASCADE;
-- DROP TABLE IF EXISTS "scraped_texts" CASCADE;
-- DROP TABLE IF EXISTS "niche_opportunities" CASCADE;
-- DROP TABLE IF EXISTS "objections" CASCADE;
-- DROP TABLE IF EXISTS "solution_patterns" CASCADE;
-- DROP TABLE IF EXISTS "case_pains" CASCADE;
-- DROP TABLE IF EXISTS "pain_library_entries" CASCADE;
-- DROP TABLE IF EXISTS "case_library_entries" CASCADE;
-- DROP TABLE IF EXISTS "worker_healths" CASCADE;
-- DROP TABLE IF EXISTS "operators" CASCADE;
-- DROP TYPE IF EXISTS "CTADestination";
-- DROP TYPE IF EXISTS "ImageType";
-- DROP TYPE IF EXISTS "FunnelStage";
-- DROP TYPE IF EXISTS "ArticleStatus";
-- DROP TYPE IF EXISTS "AttributionType";
-- DROP TYPE IF EXISTS "ConversionType";
-- DROP TYPE IF EXISTS "WorkerType";
-- DROP TYPE IF EXISTS "WorkerStatus";
-- DROP TYPE IF EXISTS "Channel";
-- DROP TYPE IF EXISTS "ContentStatus";
-- DROP TYPE IF EXISTS "ContentAngle";
-- DROP TYPE IF EXISTS "ThemeStatus";
-- DROP TYPE IF EXISTS "EntryStatus";
-- DROP TYPE IF EXISTS "UserRole";
