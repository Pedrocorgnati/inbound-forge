-- TASK-3 ST002 (CL-TA-042) — anti-duplicata Lead via hash de email+phone.
-- Passo 1: adicionar coluna nullable (backfill fora desta migration em seed-fixups).
-- Passo 2 (migration futura, pos-backfill): NOT NULL opcional.

ALTER TABLE "leads"
  ADD COLUMN "contact_hash" VARCHAR(64);

CREATE UNIQUE INDEX "leads_contact_hash_key"
  ON "leads" ("contact_hash");

-- Comentario: rows legacy com contact_hash NULL sao ignoradas pelo unique
-- (NULLs nao colidem em Postgres). Backfill determina hash a partir de contactInfo
-- descriptografado + normalizacao — ver prisma/seed-fixups/20260424_lead_contact_hash.ts
