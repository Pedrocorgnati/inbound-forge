-- CreateTable
CREATE TABLE "knowledge_entry_versions" (
    "id" TEXT NOT NULL,
    "entry_type" VARCHAR(20) NOT NULL,
    "entry_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_by" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "change_summary" VARCHAR(500),

    CONSTRAINT "knowledge_entry_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UQ_kb_versions_entry_version" ON "knowledge_entry_versions"("entry_type", "entry_id", "version");

-- CreateIndex
CREATE INDEX "IDX_kb_versions_entry" ON "knowledge_entry_versions"("entry_type", "entry_id");
