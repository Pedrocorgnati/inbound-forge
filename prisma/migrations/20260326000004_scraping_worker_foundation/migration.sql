-- Migration: scraping_worker_foundation
-- Module: module-6-scraping-worker / TASK-0 ST001
-- Rastreabilidade: INT-051, INT-098, INT-099, COMP-006

-- ─── Drop old minimal scraped_texts table ────────────────────────────────────
DROP TABLE IF EXISTS "scraped_texts";

-- ─── Sources (fontes de scraping por operador) ───────────────────────────────
CREATE TABLE "sources" (
  "id"              TEXT NOT NULL,
  "operator_id"     TEXT NOT NULL,
  "name"            VARCHAR(255) NOT NULL,
  "url"             VARCHAR(1024) NOT NULL,
  "is_active"       BOOLEAN NOT NULL DEFAULT true,
  "is_protected"    BOOLEAN NOT NULL DEFAULT false,
  "selector"        VARCHAR(512),
  "crawl_frequency" VARCHAR(50) NOT NULL DEFAULT 'daily',
  "last_crawled_at" TIMESTAMP(3),
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: um operador não pode ter a mesma URL duas vezes
ALTER TABLE "sources" ADD CONSTRAINT "sources_operator_id_url_key"
  UNIQUE ("operator_id", "url");

-- FK → operators
ALTER TABLE "sources" ADD CONSTRAINT "sources_operator_id_fkey"
  FOREIGN KEY ("operator_id") REFERENCES "operators"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Índice de listagem por operador + ativo
CREATE INDEX "IDX_sources_operator_active"
  ON "sources"("operator_id", "is_active");

-- ─── ScrapedText (textos raspados com LGPD compliance) ───────────────────────
CREATE TABLE "scraped_texts" (
  "id"                    TEXT NOT NULL,
  "operator_id"           TEXT NOT NULL,
  "source_id"             TEXT NOT NULL,
  "raw_text"              TEXT,                                -- nullable (COMP-006: descartado após 1h)
  "processed_text"        TEXT,                               -- texto anonimizado
  "url"                   VARCHAR(1024) NOT NULL,
  "title"                 VARCHAR(512),
  "classification_result" JSONB,
  "is_pain_candidate"     BOOLEAN NOT NULL DEFAULT false,
  "is_processed"          BOOLEAN NOT NULL DEFAULT false,
  "pii_removed"           BOOLEAN NOT NULL DEFAULT false,     -- rastreabilidade LGPD (INT-105)
  "batch_id"              VARCHAR(128),
  "expires_at"            TIMESTAMP(3),                       -- TTL para COMP-004
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3) NOT NULL,

  CONSTRAINT "scraped_texts_pkey" PRIMARY KEY ("id")
);

-- FK → operators
ALTER TABLE "scraped_texts" ADD CONSTRAINT "scraped_texts_operator_id_fkey"
  FOREIGN KEY ("operator_id") REFERENCES "operators"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK → sources
ALTER TABLE "scraped_texts" ADD CONSTRAINT "scraped_texts_source_id_fkey"
  FOREIGN KEY ("source_id") REFERENCES "sources"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Índices conforme spec TASK-0
CREATE INDEX "IDX_scraped_texts_operator_pain"
  ON "scraped_texts"("operator_id", "is_pain_candidate");

CREATE INDEX "IDX_scraped_texts_source_created"
  ON "scraped_texts"("source_id", "created_at");

CREATE INDEX "IDX_scraped_texts_batch"
  ON "scraped_texts"("batch_id");
