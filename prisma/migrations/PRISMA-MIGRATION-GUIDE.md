---
template: migration-guide
version-from: "0 (banco vazio)"
version-to: "1.0.0 (schema inicial)"
breaking: false
tipo: schema
data-planejada: 2026-03-25
janela-de-manutencao: qualquer horário (banco novo)
tempo-estimado: 5 minutos
rollback-possivel: true
autor: /db-migration-create
aprovado-por: Pedro Corgnati
---

# Guia de Migration Prisma — Inbound Forge

> **Tipo:** Schema inicial (banco vazio → 26 tabelas + 14 enums)
> **Breaking changes:** Não
> **Downtime necessário:** Não (banco novo)
> **Irreversível após:** Passo 4 (após dados reais inseridos)

---

## 1. Resumo

Esta migration cria a estrutura inicial do banco PostgreSQL (Supabase) para o Inbound Forge.
Não há dados existentes, portanto não há risco de perda de informação.

**O que será criado:**
- 14 enums (UserRole, EntryStatus, ThemeStatus, ContentAngle, ContentStatus, Channel, WorkerStatus, WorkerType, ConversionType, AttributionType, ArticleStatus, FunnelStage, ImageType, CTADestination)
- 26 tabelas mapeadas no `schema.prisma`
- Todos os indexes e foreign keys definidos no schema

---

## 2. Pré-Requisitos

- [ ] Supabase projeto criado e acessível
- [ ] `DATABASE_URL` e `DIRECT_URL` configurados no `.env`
- [ ] `npm install` executado no workspace
- [ ] Node.js >= 18 disponível

### Verificar conectividade

```bash
cd output/workspace/inbound-forge
npx prisma db pull --print
# Deve retornar schema vazio ou erro "no tables found" — banco deve estar vazio
```

---

## 3. Configuração do `.env`

```env
# Supabase — Connection Pooling (para queries da aplicação)
DATABASE_URL="postgresql://postgres.[ref]:[senha]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase — Direct Connection (para migrations)
DIRECT_URL="postgresql://postgres.[ref]:[senha]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

> **Importante:** O Prisma usa `DIRECT_URL` para rodar migrations e `DATABASE_URL` para queries da aplicação via PgBouncer.

---

## 4. Executar Migration (Desenvolvimento)

```bash
cd output/workspace/inbound-forge

# Gerar e aplicar a migration inicial
npx prisma migrate dev --name init

# Saída esperada:
# ✔ Generated Prisma Client
# ✔ Applied migration `20260325000000_init`
```

Este comando:
1. Detecta o delta entre o `schema.prisma` e o banco (banco vazio → todas as tabelas)
2. Gera o arquivo SQL em `prisma/migrations/20260325000000_init/migration.sql`
3. Aplica a migration no banco
4. Regenera o Prisma Client

---

## 5. Executar Migration (Produção / Staging)

Para ambientes que não usam `migrate dev` (CI/CD, Supabase):

```bash
cd output/workspace/inbound-forge

# Opção A: Prisma Migrate Deploy (recomendado para produção)
npx prisma migrate deploy

# Opção B: Supabase SQL Editor (se preferir controle manual)
# Ver seção 6 abaixo
```

---

## 6. Aplicação via Supabase SQL Editor

Se preferir aplicar o schema diretamente no Supabase SQL Editor (sem CLI local):

```bash
# Gerar SQL sem aplicar
cd output/workspace/inbound-forge
npx prisma migrate dev --name init --create-only

# O SQL estará em:
# prisma/migrations/20260325000000_init/migration.sql
# Copie e cole no Supabase SQL Editor
```

> **Alternativa**: Use o comando `/supabase-sql-editor` para gerar o SQL consolidado pronto para colar.

---

## 7. Validação Pós-Migration

```bash
# Verificar tabelas criadas
npx prisma db pull --print | grep "^model" | wc -l
# Esperado: 25 (número de models não-CasePain — CasePain é tabela implícita)

# Verificar Prisma Client gerado
npx prisma generate

# Smoke test de conectividade
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => console.log('✅ Banco conectado'))
  .then(() => prisma.operator.count())
  .then(n => console.log('✅ Tabela operators acessível, registros:', n))
  .catch(e => console.error('❌', e.message))
  .finally(() => prisma.\$disconnect());
"
```

---

## 8. Rollback

Como o banco está vazio (migration inicial), o rollback consiste em remover todas as tabelas:

```bash
# Opção A: Reset completo (apaga tudo e recria do zero)
npx prisma migrate reset
# ATENÇÃO: apaga todos os dados. Use apenas em desenvolvimento.

# Opção B: Reverter migration específica (produção)
npx prisma migrate resolve --rolled-back "20260325000000_init"
# Em seguida, dropar as tabelas manualmente ou restaurar backup

# Opção C: SQL direto (Supabase SQL Editor)
# DROP SCHEMA public CASCADE;
# CREATE SCHEMA public;
```

---

## 9. Tabelas por Ordem de Criação (FK Dependencies)

O Prisma resolve automaticamente a ordem correta, mas para referência:

```
Camada 0 (sem FK):
  operators, worker_healths, visual_assets, image_templates,
  scraped_texts, api_usage_logs, alert_logs

Camada 1 (FK para Camada 0):
  pain_library_entries, case_library_entries, niche_opportunities

Camada 2 (FK para Camada 1):
  solution_patterns, objections, case_pains

Camada 3 (FK para Camada 2):
  themes

Camada 4 (FK para Camada 3):
  image_jobs, content_pieces

Camada 5 (FK para Camada 4):
  content_angle_variants, content_rejections, posts, blog_articles

Camada 6 (FK para Camada 5):
  publishing_queue, utm_links, blog_article_versions, leads

Camada 7 (FK para Camada 6):
  conversion_events, reconciliation_items
```

---

## 10. Checklist Final

### Antes de executar
- [ ] `.env` configurado com `DATABASE_URL` e `DIRECT_URL`
- [ ] Banco Supabase vazio (sem tabelas conflitantes)
- [ ] `npm install` executado

### Após executar
- [ ] `prisma migrate dev --name init` concluiu sem erros
- [ ] Pasta `prisma/migrations/20260325000000_init/` criada
- [ ] `migration.sql` gerado dentro da pasta
- [ ] Smoke test de conectividade passou (seção 7)
- [ ] Prisma Client regenerado com sucesso

---

## 11. Próximos Passos

Após a migration inicial bem-sucedida:

1. `/seed-data-create .claude/projects/inbound-forge.json` — popular banco com dados iniciais
2. `/integration-test-create .claude/projects/inbound-forge.json` — testar endpoints com banco real
