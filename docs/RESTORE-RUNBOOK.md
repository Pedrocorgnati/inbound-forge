# RESTORE-RUNBOOK — Procedimento de Restore de Backup

**Escopo:** Inbound Forge — banco de dados Postgres (Supabase).
**Owner:** Plataforma / Dados
**SLO:** restore + smoke test em **< 30min** para DB pequeno (< 1 GB), **< 2h** para completo (> 5 GB).

---

## 1. Quando usar

- **Incidente:** corrupcao, perda de dados, migracao ruim em producao.
- **Ensaio:** trimestralmente validamos que o backup e restauravel (gate de `CL-322`).
- **Troubleshooting:** investigar estado historico em ambiente isolado sem tocar producao.

---

## 2. Pre-requisitos

- Acesso ao dashboard Supabase do projeto (`https://app.supabase.com/project/_/database/backups`).
- `psql` instalado localmente (>= 14).
- DB de teste provisionado (Supabase free tier ou Docker local).
- Variaveis de ambiente:
  - `SUPABASE_BACKUP_PATH` — caminho local do dump.sql baixado.
  - `TEST_DATABASE_URL` — connection string do DB de teste (com privilegio de CREATE).

---

## 3. Passos

### 3.1 Baixar o dump

1. Supabase Dashboard > Project > Database > Backups.
2. Selecionar o ponto de restore (diario nos ultimos 7 dias; weekly ate 30 dias).
3. Clicar **Download dump** — arquivo `dump-YYYYMMDD.sql`.
4. Salvar em `~/backups/inbound-forge/`.

### 3.2 Provisionar DB de teste

**Opcao A — Supabase free project:**
1. Criar novo projeto `inbound-forge-restore-test`.
2. Copiar connection string em Settings > Database.

**Opcao B — Docker local:**
```bash
docker run --name pg-restore -e POSTGRES_PASSWORD=restore -p 54322:5432 -d postgres:15
export TEST_DATABASE_URL=postgresql://postgres:restore@localhost:54322/postgres
```

### 3.3 Rodar o restore + smoke

```bash
export SUPABASE_BACKUP_PATH=~/backups/inbound-forge/dump-20260418.sql
export TEST_DATABASE_URL=<connection-string>
pnpm tsx scripts/restore-backup.ts
```

O script faz:
1. Valida que o dump existe.
2. Executa `psql $TEST_DATABASE_URL < dump.sql`.
3. Smoke test via Prisma: conta `BlogArticle` e `Lead`.
4. Retorna exit 0 em sucesso, 1 em falha.

### 3.4 Validar manualmente

Apos o script terminar:

```bash
export DATABASE_URL=$TEST_DATABASE_URL
pnpm prisma studio
```

Checar visualmente:
- [ ] Tabelas populadas
- [ ] Ultimo `BlogArticle` tem `publishedAt` recente
- [ ] `AuditLog` contem entradas das ultimas 24h
- [ ] Nenhum erro no console

### 3.5 (Opcional) Apontar app para o DB restaurado

Apenas em ambiente de **teste/staging**. Nunca em producao sem aprovacao da plataforma.

```bash
export DATABASE_URL=$TEST_DATABASE_URL
pnpm dev
```

Smoke endpoints:
- `GET /api/health` -> 200
- `GET /pt-BR/blog` -> lista artigos
- Login com conta de teste -> dashboard carrega

---

## 4. Rollback em caso de falha

| Sintoma | Acao |
|---------|------|
| Script aborta em `psql falhou` | Verificar `TEST_DATABASE_URL`; testar conexao manualmente com `psql`. |
| Smoke test falha (0 rows) | Dump corrompido. Tentar dump anterior; abrir incidente Sentry. |
| Schema mismatch apos restore | Rodar `pnpm prisma migrate deploy` no DB restaurado para alinhar. |
| Foreign key violations | Backup pode estar incompleto. Re-baixar com `--include-dependencies`. |

---

## 5. Registro

Apos cada restore, registrar em `docs/RESTORE-LOG.md` (append-only):

```markdown
- 2026-04-18 — pedro — dump diario 2026-04-17 — OK (BlogArticle=120, Lead=3420) — 12min
```

---

## 6. Automacao (futuro)

Objetivo: job mensal em GitHub Actions que baixa backup, faz restore em DB de teste efemero e falha se smoke test nao passar. Issue de tracking: pendente.
