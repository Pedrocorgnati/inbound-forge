-- TASK-13 ST002 (CL-105): tabela de fontes customizadas
CREATE TABLE "custom_fonts" (
  "id" TEXT PRIMARY KEY,
  "operator_id" TEXT NOT NULL,
  "family" VARCHAR(120) NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 400,
  "style" VARCHAR(20) NOT NULL DEFAULT 'normal',
  "storage_path" VARCHAR(512) NOT NULL,
  "public_url" VARCHAR(1024),
  "file_size" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "IDX_custom_fonts_operator_active" ON "custom_fonts" ("operator_id", "is_active");
