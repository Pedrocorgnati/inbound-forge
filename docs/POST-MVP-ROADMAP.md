# POST-MVP-ROADMAP — Inbound Forge

**Criado por:** module-16/TASK-6
**Data:** 2026-03-26
**Owner:** Pedro Corgnati
**Versão:** 1.0

---

## Visão Geral

Roadmap de features e melhorias pós-MVP priorizadas por impacto, complexidade e quarter de entrega.

**Princípio:** MVP = ferramenta funcional para Pedro. Pós-MVP = escalar e automatizar com qualidade.

---

## Q3 2026 (Julho–Setembro)

### 1. COMP-004: TTL para Dados Pessoais (LGPD) — PRIORIDADE CRÍTICA

**Rastreabilidade:** COMP-004, INT-LGPD
**Complexidade:** Baixa (2-3h)
**Impacto:** Crítico — compliance LGPD obrigatório

**Problema:** Leads e ApiUsageLogs não têm exclusão automática após período de retenção.
LGPD exige que dados pessoais sejam excluídos após prazo definido e consentimento expirado.

**Implementação:**
```typescript
// cron/lead-ttl.ts — Upstash QStash agendado
// Executa: todo dia 00:00 UTC
// Ação: deletar leads com consentimento expirado (lgpdConsent + 2 anos)

import { prisma } from '@/lib/prisma'

export async function runLeadTTLCron() {
  const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
  const deleted = await prisma.lead.deleteMany({
    where: {
      lgpdConsent: true,
      createdAt: { lt: twoYearsAgo },
    },
  })
  console.log(`[lead-ttl] ${deleted.count} leads excluídos por TTL LGPD`)
}
```

**ApiUsageLog TTL:**
```typescript
// Deletar logs com mais de 90 dias (dados de uso não são PII mas ocupam espaço)
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
await prisma.apiUsageLog.deleteMany({ where: { recordedAt: { lt: ninetyDaysAgo } } })
```

**Checklist:**
- [ ] `cron/lead-ttl.ts` com endpoint protegido
- [ ] Configurar QStash no Upstash com schedule diário
- [ ] Adicionar ao CI: teste que cron endpoint existe e responde 200
- [ ] Documentar política de retenção no PENDING-DECISIONS.md

---

### 2. Learn-to-Rank com Cron Semanal (INT-075)

**Rastreabilidade:** INT-075
**Complexidade:** Média (4-6h)
**Impacto:** Alto — melhora relevância dos temas gerados automaticamente

**Contexto:** O módulo learn-to-rank (`src/lib/learn-to-rank.ts`) já existe mas depende de
threshold de dados (5+ posts, 5+ conversões — já monitorado em `/health/detailed`).

**Implementação:**
```typescript
// cron/learn-to-rank.ts — Upstash QStash agendado (semanal, domingo 3h UTC)
// Re-treina modelo L2R com conversões da semana
// Atualiza Theme.conversionScore via LTR weights
```

**Threshold de ativação:** `postsCount >= 5 && conversionsCount >= 5`
(já monitorado em `/health/detailed.learnToRankThreshold.enabled`)

---

### 3. Browserless Self-Hosted no Railway (INT-123)

**Rastreabilidade:** INT-123
**Complexidade:** Baixa (1-2h)
**Impacto:** Médio — redução de $15/mês ($25 → $10)

**Quando:** Uso de Browserless > 4h/mês por 2 meses consecutivos.

Ver spec completa em: [docs/decisions/INT-123-browserless-plan.md](./decisions/INT-123-browserless-plan.md)

---

### 4. Resend Email Alerts Completo (NOTIF-001)

**Rastreabilidade:** NOTIF-001
**Complexidade:** Baixa (1h — infraestrutura já pronta em `src/lib/alert-email.ts`)
**Impacto:** Médio — operador recebe alertas sem precisar monitorar dashboard

**Pendente apenas:** Configurar `RESEND_API_KEY` e `ALERT_EMAIL_TO` em produção.

---

## Q4 2026 (Outubro–Dezembro)

### 5. Blog MDX Export (INT-097)

**Rastreabilidade:** INT-097
**Complexidade:** Média (2-3h)
**Impacto:** Baixo-Médio — útil para reutilização de conteúdo

**Threshold de ativação:** 20+ artigos publicados.

Ver spec completa em: [docs/decisions/INT-097-blog-mdx-export.md](./decisions/INT-097-blog-mdx-export.md)

---

### 6. Multi-User Support

**Rastreabilidade:** —
**Complexidade:** Alta (20-40h)
**Impacto:** Alto — transformar ferramenta pessoal em produto SaaS

**Requisitos principais:**
- Isolamento de dados por `operatorId` (já estruturado no schema Prisma)
- Billing por usuário (Stripe)
- Onboarding flow
- Role-based access control (ADMIN / OPERATOR)

**Decisão:** Adiar para quando houver demanda comprovada de > 3 usuários interessados.

---

### 7. Análise Competitiva Automatizada (INT-124)

**Rastreabilidade:** INT-124
**Complexidade:** Média (4-6h)
**Impacto:** Médio — diferenciação estratégica de conteúdo

**Dependência:** INT-122 (fontes de scraping configuradas) + INT-123 (Browserless estável)

Ver template em: [docs/decisions/INT-124-competitors-mapping.md](./decisions/INT-124-competitors-mapping.md)

---

## Backlog Indefinido

| Feature | Motivo de Adiamento |
|---------|---------------------|
| Mobile app nativo | ROI insuficiente para uso pessoal |
| Integração direta LinkedIn API | INT-068 — proibido pela política do LinkedIn. Usar content copy manual. |
| Video generation (Sora/Kling) | Custo elevado e qualidade incerta |
| GPT-4o vision para análise de imagens | Substituível pelo atual pipeline Ideogram |

---

## Métricas de Sucesso Pós-MVP

| Métrica | Baseline | Meta Q3 | Meta Q4 |
|---------|---------|---------|---------|
| Posts publicados/mês | 20 | 50 | 100 |
| Taxa de conversão lead→oportunidade | — | 5% | 10% |
| Custo/post gerado | ~$0.90 | <$0.70 | <$0.50 |
| Learn-to-rank ativo | Não | Sim | Sim |
| Compliance LGPD (TTL cron) | Pendente | Implementado | Auditado |

---

## Próxima Revisão

**2026-06-01** — priorizar Q3 com base em 3 meses de dados reais.
