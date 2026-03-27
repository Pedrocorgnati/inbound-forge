-- Migration: module12_publishing
-- Módulo: module-12-calendar-publishing (TASK-0/ST002)
-- Data: 2026-03-26
-- Rollback: Ver seção DROP abaixo
--
-- Pré-requisitos:
--   - module-8 migration applied (ContentPiece deve existir)
--   - module-2 migration applied (enums Channel, ContentStatus existem)
--
-- Rollback:
--   DROP TABLE IF EXISTS "publish_audit_logs";
--   ALTER TABLE "posts" DROP COLUMN IF EXISTS "approved_at";
--   ALTER TABLE "posts" DROP COLUMN IF EXISTS "platform";
--   ALTER TABLE "posts" DROP COLUMN IF EXISTS "platform_post_id";
--   ALTER TABLE "posts" DROP COLUMN IF EXISTS "cta_text";
--   ALTER TABLE "posts" DROP COLUMN IF EXISTS "cta_url";
--   ALTER TABLE "publishing_queue" DROP COLUMN IF EXISTS "channel";
--   ALTER TABLE "publishing_queue" DROP COLUMN IF EXISTS "scheduled_at";
--   ALTER TABLE "publishing_queue" DROP COLUMN IF EXISTS "priority";
--   ALTER TABLE "publishing_queue" DROP COLUMN IF EXISTS "max_attempts";
--   ALTER TABLE "publishing_queue" DROP COLUMN IF EXISTS "last_error";
--   ALTER TABLE "publishing_queue" DROP COLUMN IF EXISTS "status";
--   DROP TYPE IF EXISTS "QueueStatus";

-- 1. Adicionar SCHEDULED ao enum ContentStatus
ALTER TYPE "ContentStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';

-- 2. Criar enum QueueStatus
DO $$ BEGIN
  CREATE TYPE "QueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Atualizar tabela posts
-- 3a. Tornar content_piece_id nullable (posts manuais)
ALTER TABLE "posts" ALTER COLUMN "content_piece_id" DROP NOT NULL;

-- 3b. Adicionar campo cta DEFAULT '' para posts existentes
ALTER TABLE "posts" ALTER COLUMN "cta" SET DEFAULT '';

-- 3c. Novos campos
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "cta_text" VARCHAR(500);
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "cta_url" VARCHAR(1024);
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "platform" VARCHAR(50);
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "platform_post_id" VARCHAR(255);

-- 3d. scheduledAt now nullable
ALTER TABLE "posts" ALTER COLUMN "scheduled_at" DROP NOT NULL;

-- 3e. Índice adicional
CREATE INDEX IF NOT EXISTS "IDX_posts_content_piece_id" ON "posts"("content_piece_id");

-- 4. Atualizar tabela publishing_queue
ALTER TABLE "publishing_queue" ADD COLUMN IF NOT EXISTS "channel" VARCHAR(50);
ALTER TABLE "publishing_queue" ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMP;
ALTER TABLE "publishing_queue" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "publishing_queue" ADD COLUMN IF NOT EXISTS "max_attempts" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "publishing_queue" ADD COLUMN IF NOT EXISTS "last_error" TEXT;
ALTER TABLE "publishing_queue" ADD COLUMN IF NOT EXISTS "status" "QueueStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "publishing_queue" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT NOW();

-- 4b. Índices
CREATE INDEX IF NOT EXISTS "IDX_publishing_queue_scheduled_at" ON "publishing_queue"("scheduled_at");
CREATE INDEX IF NOT EXISTS "IDX_publishing_queue_status" ON "publishing_queue"("status");

-- 5. Criar tabela publish_audit_logs (COMP-001)
CREATE TABLE IF NOT EXISTS "publish_audit_logs" (
  "id"               VARCHAR(36)  NOT NULL,
  "post_id"          VARCHAR(36)  NOT NULL,
  "action"           VARCHAR(50)  NOT NULL,
  "result"           VARCHAR(20)  NOT NULL,
  "platform_post_id" VARCHAR(255),
  "error_message"    TEXT,
  "attempts"         INTEGER      NOT NULL DEFAULT 1,
  "timestamp"        TIMESTAMP    NOT NULL DEFAULT NOW(),
  CONSTRAINT "publish_audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "publish_audit_logs_post_fk" FOREIGN KEY ("post_id")
    REFERENCES "posts"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_publish_audit_logs_post" ON "publish_audit_logs"("post_id");
