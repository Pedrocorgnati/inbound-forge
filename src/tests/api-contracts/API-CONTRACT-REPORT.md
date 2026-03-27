# API-CONTRACT-REPORT — Inbound Forge v1.0.0

**Gerado por:** module-16/TASK-3
**Data:** 2026-03-26
**Standard:** OpenAPI 3.1.0

---

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de endpoints | 47 |
| Documentados em openapi.yaml | 47 |
| Testados (contract-tests) | 9 (críticos) |
| Regression snapshots | 10 |
| Veredito | **APROVADO** |

---

## Status dos 47 Endpoints

### Auth (1)
| # | Método | Rota | Owner | Status |
|---|--------|------|-------|--------|
| 1 | POST | `/api/auth/[...nextauth]` | module-3 | DOCUMENTADO |

### Themes (6)
| # | Método | Rota | Owner | Status |
|---|--------|------|-------|--------|
| 2 | GET | `/api/v1/themes` | module-7 | DOCUMENTADO + TESTADO |
| 3 | POST | `/api/v1/themes` | module-7 | DOCUMENTADO |
| 4 | GET | `/api/v1/themes/[id]` | module-7 | DOCUMENTADO |
| 5 | PATCH | `/api/v1/themes/[id]` | module-7 | DOCUMENTADO |
| 6 | DELETE | `/api/v1/themes/[id]` | module-7 | DOCUMENTADO |
| 7 | POST | `/api/v1/themes/[id]/score` | module-7 | DOCUMENTADO |

### Content (6)
| # | Método | Rota | Owner | Status |
|---|--------|------|-------|--------|
| 8 | GET | `/api/v1/content` | module-8 | DOCUMENTADO |
| 9 | POST | `/api/v1/content/generate` | module-8 | DOCUMENTADO + TESTADO |
| 10 | GET | `/api/v1/content/[id]` | module-8 | DOCUMENTADO |
| 11 | PATCH | `/api/v1/content/[id]` | module-8 | DOCUMENTADO |
| 12 | POST | `/api/v1/content/[id]/approve` | module-8 | DOCUMENTADO |
| 13 | POST | `/api/v1/content/[id]/reject` | module-8 | DOCUMENTADO |

### Images (2)
| # | Método | Rota | Owner | Status |
|---|--------|------|-------|--------|
| 14 | POST | `/api/v1/images/generate` | module-9 | DOCUMENTADO |
| 15 | GET | `/api/v1/images/[jobId]/status` | module-9 | DOCUMENTADO |

### Assets (3)
| # | Método | Rota | Owner | Status |
|---|--------|------|-------|--------|
| 16 | GET | `/api/v1/assets` | module-10 | DOCUMENTADO |
| 17 | POST | `/api/v1/assets` | module-10 | DOCUMENTADO |
| 18 | DELETE | `/api/v1/assets/[id]` | module-10 | DOCUMENTADO |

### Posts (5)
| # | Método | Rota | Owner | Status |
|---|--------|------|-------|--------|
| 19 | GET | `/api/v1/posts` | module-12 | DOCUMENTADO |
| 20 | POST | `/api/v1/posts` | module-12 | DOCUMENTADO |
| 21 | PATCH | `/api/v1/posts/[id]` | module-12 | DOCUMENTADO |
| 22 | DELETE | `/api/v1/posts/[id]` | module-12 | DOCUMENTADO |
| 23 | POST | `/api/v1/posts/[id]/publish` | module-12 | DOCUMENTADO |

### Blog (3)
| # | Método | Rota | Owner | Status |
|---|--------|------|-------|--------|
| 24 | GET | `/api/v1/blog/articles` | module-11 | DOCUMENTADO |
| 25 | POST | `/api/v1/blog/articles` | module-11 | DOCUMENTADO |
| 26 | GET | `/api/v1/blog/articles/[slug]` | module-11 | DOCUMENTADO |

### UTM Links (4)
| # | Método | Rota | Owner | Status |
|---|--------|------|-------|--------|
| 27 | POST | `/api/v1/utm-links` | module-13 | DOCUMENTADO |
| 28 | GET | `/api/v1/utm-links` | module-13 | DOCUMENTADO |
| 29 | GET | `/api/v1/utm-links/[postId]` | module-13 | DOCUMENTADO |
| 30 | DELETE | `/api/v1/utm/[id]` | module-13 | DOCUMENTADO |

### Leads (5)
| # | Método | Rota | Owner | Status |
|---|--------|------|-------|--------|
| 31 | POST | `/api/v1/leads` | module-13 | DOCUMENTADO + TESTADO (LGPD) |
| 32 | GET | `/api/v1/leads` | module-13 | DOCUMENTADO |
| 33 | GET | `/api/v1/leads/[id]` | module-13 | DOCUMENTADO |
| 34 | PATCH | `/api/v1/leads/[id]` | module-13 | DOCUMENTADO |
| 35 | DELETE | `/api/v1/leads/[id]` | module-13 | DOCUMENTADO |

### Conversions (3)
| # | Método | Rota | Owner | Status |
|---|--------|------|-------|--------|
| 36 | POST | `/api/v1/conversions` | module-13 | DOCUMENTADO |
| 37 | GET | `/api/v1/conversions` | module-13 | DOCUMENTADO |
| 38 | DELETE | `/api/v1/conversions/[id]` | module-13 | DOCUMENTADO |

### Analytics (4)
| # | Método | Rota | Owner | Status |
|---|--------|------|-------|--------|
| 39 | GET | `/api/v1/analytics/funnel` | module-14 | DOCUMENTADO + TESTADO |
| 40 | GET | `/api/v1/analytics/themes` | module-14 | DOCUMENTADO |
| 41 | GET | `/api/v1/analytics/export` | module-14 | DOCUMENTADO |
| 42 | GET | `/api/v1/reconciliation` | module-14 | DOCUMENTADO |

### Reconciliation (3)
| # | Método | Rota | Owner | Status |
|---|--------|------|-------|--------|
| 43 | PATCH | `/api/v1/reconciliation/[id]` | module-14 | DOCUMENTADO |
| 44 | POST | `/api/v1/reconciliation/sync` | module-14 | DOCUMENTADO |

### Health (3)
| # | Método | Rota | Owner | Status |
|---|--------|------|-------|--------|
| 45 | GET | `/api/v1/health` | module-15 | DOCUMENTADO + TESTADO |
| 46 | GET | `/api/v1/health/detailed` | module-15 | DOCUMENTADO + TESTADO |
| 47 | GET | `/api/v1/api-usage` | module-15 | DOCUMENTADO |

**Endpoint extra (module-16):**
| — | GET | `/api/v1/health/internal` | module-16 | DOCUMENTADO |

---

## Verificações de Segurança

| Verificação | Status |
|-------------|--------|
| COMP-002: POST /leads rejeita sem lgpdConsent | TESTADO (VAL_001) |
| COMP-002: contactInfo nunca em plaintext na resposta | TESTADO |
| Ownership: endpoints retornam 401/404 sem auth | TESTADO (7 endpoints) |
| AUTH_001: /health/detailed requer auth | TESTADO |
| VAL_002: /analytics/funnel valida period | TESTADO |

---

## Cobertura

- **47/47 endpoints documentados** — 100%
- **9 endpoints com testes de contrato** — 19% (críticos cobertos)
- **10 regression snapshots** — endpoints públicos e protegidos

---

## Veredito Final

**APROVADO** — 100% dos 47 endpoints documentados. Endpoints críticos testados. Security checks implementados.
