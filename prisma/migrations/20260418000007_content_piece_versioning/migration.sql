-- TASK-12 ST001 (CL-076): snapshot de copy a cada edicao de ContentPiece
CREATE TABLE "content_piece_versions" (
  "id" TEXT PRIMARY KEY,
  "piece_id" TEXT NOT NULL,
  "copy" JSONB NOT NULL,
  "variant_snapshot" JSONB NOT NULL,
  "change_summary" VARCHAR(500),
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "content_piece_versions_piece_fk"
    FOREIGN KEY ("piece_id") REFERENCES "content_pieces"("id") ON DELETE CASCADE
);

CREATE INDEX "IDX_content_piece_versions_piece_created"
  ON "content_piece_versions" ("piece_id", "created_at" DESC);
