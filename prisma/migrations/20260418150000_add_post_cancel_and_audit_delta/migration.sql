-- Intake-Review TASK-1 (CL-224/CL-225/CL-226/CL-080)
-- Adiciona CANCELLED em ContentStatus/QueueStatus, cancelledAt + sourcePostId + themeId em Post,
-- e operatorId + delta em PublishAuditLog para suportar cancel/edit/duplicate com auditoria de delta.

ALTER TYPE "ContentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "QueueStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE "posts" ADD COLUMN "cancelled_at" TIMESTAMP(3);
ALTER TABLE "posts" ADD COLUMN "cancelled_by_operator_id" VARCHAR(255);
ALTER TABLE "posts" ADD COLUMN "source_post_id" TEXT;
ALTER TABLE "posts" ADD COLUMN "theme_id" TEXT;

ALTER TABLE "publish_audit_logs" ADD COLUMN "operator_id" VARCHAR(255);
ALTER TABLE "publish_audit_logs" ADD COLUMN "delta" JSONB;
ALTER TABLE "publish_audit_logs" ALTER COLUMN "result" SET DEFAULT 'success';
