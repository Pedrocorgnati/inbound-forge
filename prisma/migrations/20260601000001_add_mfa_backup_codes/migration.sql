-- loop 05-27 TAREFA-028 (P3): MFA/TOTP opt-in.
-- Cria a tabela de backup codes de recovery. O segredo TOTP NAO vive aqui — ele
-- e gerido pelo Supabase Auth (criptografado em repouso). Esta tabela guarda
-- apenas o HASH SHA-256 de cada backup code one-time, chaveado por user_id
-- (auth.users.id). Migration idempotente (IF NOT EXISTS) — segura para
-- re-aplicacao sobre baseline com drift.

CREATE TABLE IF NOT EXISTS "mfa_backup_codes" (
  "id"         TEXT NOT NULL,
  "user_id"    TEXT NOT NULL,
  "code_hash"  VARCHAR(64) NOT NULL,
  "used_at"    TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "mfa_backup_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_mfa_backup_codes_user_hash"
  ON "mfa_backup_codes" ("user_id", "code_hash");

CREATE INDEX IF NOT EXISTS "IDX_mfa_backup_codes_user"
  ON "mfa_backup_codes" ("user_id");
