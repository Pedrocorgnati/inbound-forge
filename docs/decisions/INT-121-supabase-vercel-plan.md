# INT-121: Plano Supabase/Vercel — Critérios de Upgrade

**Rastreabilidade:** INT-121
**Data:** 2026-03-26
**Owner:** Pedro Corgnati
**Data de revisão:** 2026-06-01
**Status:** DECISÃO TOMADA — Manter Free até atingir 80% dos limites

---

## Contexto

O Inbound Forge MVP foi lançado nos planos gratuitos de Supabase e Vercel.
Esta decisão documenta formalmente os critérios para upgrade e os custos esperados.

---

## Limites Atuais e Thresholds de Upgrade

| Serviço | Plano | Limite | Threshold (80%) | Ação de Upgrade |
|---------|-------|--------|-----------------|----------------|
| Supabase | Free | 500MB DB | **400MB** | Upgrade para Supabase Pro ($25/mês) |
| Supabase | Free | 2GB bandwidth/mês | **1.6GB** | Upgrade para Supabase Pro |
| Supabase | Free | 50MB storage | **40MB** | Upgrade para Supabase Pro |
| Vercel | Hobby | 100GB bandwidth/mês | **80GB** | Upgrade para Vercel Pro ($20/mês) |
| Vercel | Hobby | 10s function timeout | — | Upgrade se timeout em produção |
| Upstash | Free | 10k req/dia | **8k/dia** | Migrar para Pay-as-you-go (~$5/mês) |
| Upstash | Free | 256MB memória | **200MB** | Migrar para Pay-as-you-go |

---

## Monitoramento

**Como verificar em tempo real:**
- `/health/detailed` → `learnToRankThreshold.postsCount` (proxy de uso do DB)
- `/api/v1/api-usage` → uso de cada serviço
- Supabase Dashboard → Database → Storage Usage
- Vercel Dashboard → Analytics → Bandwidth

**Frequência:** Verificar no dia 1 de cada mês.

---

## Custos de Upgrade

| Cenário | Custo Adicional | Total Mensal |
|---------|-----------------|--------------|
| Apenas Supabase Pro | +$25/mês | ~$65-80/mês |
| Apenas Vercel Pro | +$20/mês | ~$60-75/mês |
| Ambos | +$45/mês | ~$85-100/mês |
| + Upstash Pay-as-you-go | +$5/mês | ~$90-110/mês |

---

## Decisão

**MVP:** Manter nos planos gratuitos. Monitorar mensalmente.

**Regra de upgrade:** Atingir 80% de qualquer limite → upgrade imediato (não esperar 100% para evitar interrupção de serviço).

**Estimativa de quando atingir 80%:** 6-12 meses com crescimento orgânico (200-300 posts/mês).

---

## Data de Revisão

**2026-06-01** — revisar com dados reais de 3 meses de operação.
