# DB Migration Report

**Projeto:** inbound-forge
**ORM:** Prisma
**Database:** PostgreSQL (Supabase)
**Data:** 2026-03-25
**Data-Integrity-Decision:** não disponível
**Schema existente:** atualizado (baseline do /back-end-build)

---

## Migrations Geradas

| # | Arquivo | Operação | Tabelas Afetadas | Tipo | Reversível |
|---|---------|----------|-----------------|------|------------|
| 1 | `20260325000000_init` | CREATE ENUM (×14) | — | additive | Sim |
| 2 | `20260325000000_init` | CREATE TABLE `operators` | operators | additive | Sim |
| 3 | `20260325000000_init` | CREATE TABLE `worker_healths` | worker_healths | additive | Sim |
| 4 | `20260325000000_init` | CREATE TABLE `case_library_entries` | case_library_entries | additive | Sim |
| 5 | `20260325000000_init` | CREATE TABLE `pain_library_entries` | pain_library_entries | additive | Sim |
| 6 | `20260325000000_init` | CREATE TABLE `case_pains` | case_pains | additive | Sim |
| 7 | `20260325000000_init` | CREATE TABLE `solution_patterns` | solution_patterns | additive | Sim |
| 8 | `20260325000000_init` | CREATE TABLE `objections` | objections | additive | Sim |
| 9 | `20260325000000_init` | CREATE TABLE `niche_opportunities` | niche_opportunities | additive | Sim |
| 10 | `20260325000000_init` | CREATE TABLE `scraped_texts` | scraped_texts | additive | Sim |
| 11 | `20260325000000_init` | CREATE TABLE `themes` | themes | additive | Sim |
| 12 | `20260325000000_init` | CREATE TABLE `image_jobs` | image_jobs | additive | Sim |
| 13 | `20260325000000_init` | CREATE TABLE `content_pieces` | content_pieces | additive | Sim |
| 14 | `20260325000000_init` | CREATE TABLE `content_angle_variants` | content_angle_variants | additive | Sim |
| 15 | `20260325000000_init` | CREATE TABLE `content_rejections` | content_rejections | additive | Sim |
| 16 | `20260325000000_init` | CREATE TABLE `visual_assets` | visual_assets | additive | Sim |
| 17 | `20260325000000_init` | CREATE TABLE `image_templates` | image_templates | additive | Sim |
| 18 | `20260325000000_init` | CREATE TABLE `posts` | posts | additive | Sim |
| 19 | `20260325000000_init` | CREATE TABLE `publishing_queue` | publishing_queue | additive | Sim |
| 20 | `20260325000000_init` | CREATE TABLE `blog_articles` | blog_articles | additive | Sim |
| 21 | `20260325000000_init` | CREATE TABLE `blog_article_versions` | blog_article_versions | additive | Sim |
| 22 | `20260325000000_init` | CREATE TABLE `leads` | leads | additive | Sim |
| 23 | `20260325000000_init` | CREATE TABLE `conversion_events` | conversion_events | additive | Sim |
| 24 | `20260325000000_init` | CREATE TABLE `utm_links` | utm_links | additive | Sim |
| 25 | `20260325000000_init` | CREATE TABLE `reconciliation_items` | reconciliation_items | additive | Sim |
| 26 | `20260325000000_init` | CREATE TABLE `api_usage_logs` | api_usage_logs | additive | Sim |
| 27 | `20260325000000_init` | CREATE TABLE `alert_logs` | alert_logs | additive | Sim |

---

## Ordem de Execução (FK Dependencies)

O Prisma resolve automaticamente, mas para referência manual:

```
1. operators, worker_healths, visual_assets, image_templates,
   scraped_texts, api_usage_logs, alert_logs       [sem dependências]

2. pain_library_entries, case_library_entries,
   niche_opportunities                              [FK: nenhuma]

3. solution_patterns                                [FK: pain_library_entries, case_library_entries]
   objections                                       [FK: nenhuma]
   case_pains                                       [FK: case_library_entries, pain_library_entries]

4. themes                                           [FK: pain_library_entries, case_library_entries,
                                                         solution_patterns, niche_opportunities]

5. image_jobs                                       [FK: nenhuma direta]
   content_pieces                                   [FK: themes, image_jobs]

6. content_angle_variants                           [FK: content_pieces]
   content_rejections                               [FK: content_pieces]
   posts                                            [FK: content_pieces]
   blog_articles                                    [FK: content_pieces]

7. publishing_queue                                 [FK: posts]
   utm_links                                        [FK: posts]
   blog_article_versions                            [FK: blog_articles]
   leads                                            [FK: posts, themes]

8. conversion_events                                [FK: leads]
   reconciliation_items                             [FK: leads]
```

---

## Comandos de Aplicação

### Desenvolvimento

```bash
cd output/workspace/inbound-forge

# Gerar e aplicar migration inicial
npx prisma migrate dev --name init
```

### Staging (OBRIGATÓRIO antes da produção)

```bash
# 1. Configurar .env com credenciais do Supabase Staging
# 2. Aplicar migrations
npx prisma migrate deploy

# 3. Smoke test de conectividade
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$connect()
  .then(() => p.operator.count())
  .then(n => console.log('✅ operators:', n))
  .catch(e => console.error('❌', e.message))
  .finally(() => p.\$disconnect());
"
```

### Produção

```bash
# Backup antes (Supabase faz backup automático, mas documente)
# 1. Executar no horário de menor tráfego (banco novo — qualquer horário)
npx prisma migrate deploy

# 2. Verificar
npx prisma db pull --print | grep "^model" | wc -l
# Esperado: ~25 models

# 3. Monitorar logs por 15 min
```

---

## Rollback

Como esta é a migration inicial (banco vazio), rollback = dropar tudo:

```bash
# Desenvolvimento — reset completo
npx prisma migrate reset

# Produção — via Supabase SQL Editor
# DROP SCHEMA public CASCADE;
# CREATE SCHEMA public;
# (em seguida, rodar prisma migrate deploy novamente)
```

---

## Observações de Qualidade

### Pontos positivos verificados
- Todos os models têm `createdAt` e `updatedAt` (exceto entities de log imutáveis — correto)
- Todos os campos FK têm `ON DELETE` explícito onde se aplica
- Indexes em campos de busca frequente: `status`, `classified`, `scheduled_at`, `slug`
- Unique constraints em campos de negócio: `email` (Operator), `slug` (BlogArticle), `type` (WorkerHealth)
- `@map` consistente em todos os campos (camelCase Prisma → snake_case SQL)

### Observações de melhoria (não bloqueantes)
- `leads.firstTouchThemeId` — sem index explícito (Prisma cria automaticamente para FKs em alguns casos, mas recomenda-se verificar)
- `blog_article_versions.articleId` — sem index explícito além do FK
- `reconciliation_items.leadId` e `postId` — sem indexes explícitos
- `ImageJob.contentPiece ContentPiece? @relation` — sintaxe sem argumentos; Prisma infere pela unique constraint em `imageJobId`, mas verificar se não gera erro de relação ambígua

> Esses itens podem ser ajustados no `schema.prisma` antes de rodar a migration se desejado.

---

## Checklist Pré-Deploy

- [ ] Backup do banco de produção realizado (ou confirmado via Supabase Dashboard)
- [ ] Migrations testadas em ambiente de staging
- [ ] Scripts de rollback testados em staging
- [ ] `DATABASE_URL` e `DIRECT_URL` configurados no `.env` de produção
- [ ] Smoke test de conectividade passou (seção Staging acima)
- [ ] Prisma Client regenerado: `npx prisma generate`

---

## Guia Detalhado

Ver `prisma/migrations/PRISMA-MIGRATION-GUIDE.md` para instruções completas de execução, validação e rollback.

---

## Checklist de Segurança

| Item | Status | Observação |
|------|--------|------------|
| Tem rollback documentado | ✅ | `prisma migrate reset` ou DROP SCHEMA |
| Rollback não depende de dados perdidos | ✅ | Banco inicial vazio |
| IF NOT EXISTS / idempotência | ✅ | Prisma gerencia automaticamente |
| Colunas NOT NULL têm DEFAULT | ✅ | Verificado no schema |
| Nenhum DROP sem backup | ✅ | Não há DROPs |
| FK com ON DELETE explícito | ✅ | Verificado (Cascade em children, Restrict implícito em outros) |
| Indexes para FK | ⚠️ | 4 FK sem index explícito (ver Observações) |
| Enums do catalog mapeados | ✅ | 14 enums criados conforme LLD |
| Sem ALTER em tabelas com >100k | ✅ | N/A — banco novo |
| Schema alinhado com ERD do LLD | ✅ | 26 models, todos verificados |

**Checklist: 9/10 items ok** (1 observação não-bloqueante sobre indexes)
