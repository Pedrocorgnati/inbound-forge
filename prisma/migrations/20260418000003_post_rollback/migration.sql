-- AlterEnum
ALTER TYPE "ContentStatus" ADD VALUE 'ROLLED_BACK';

-- AlterTable
ALTER TABLE "posts" ADD COLUMN "rolled_back_at" TIMESTAMP(3);
ALTER TABLE "posts" ADD COLUMN "rollback_reason" VARCHAR(500);
ALTER TABLE "posts" ADD COLUMN "rollback_by_operator_id" VARCHAR(255);
