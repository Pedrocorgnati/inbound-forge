-- Intake-Review TASK-6 (CL-312): add published_url para modo assistido
ALTER TABLE "posts" ADD COLUMN "published_url" VARCHAR(1024);
