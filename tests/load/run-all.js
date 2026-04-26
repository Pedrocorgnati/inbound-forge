/**
 * Inbound Forge — Orquestrador de Load Tests
 *
 * Uso rápido por cenário:
 *   k6 run --env BASE_URL=http://localhost:3000 tests/load/scenarios/01-health-basic.js
 *
 * Uso com smoke test (1 VU, 1 min):
 *   k6 run --env SCENARIO=smoke tests/load/scenarios/01-health-basic.js
 *
 * Uso com credenciais (cenários autenticados):
 *   k6 run \
 *     --env BASE_URL=http://localhost:3000 \
 *     --env SESSION_COOKIE="sb-access-token=<token>" \
 *     --env LOAD_TEST_USER="pedro@example.com" \
 *     --env LOAD_TEST_PASS="SuaSenha123!" \
 *     tests/load/scenarios/04-knowledge-cases.js
 *
 * Variáveis de ambiente disponíveis:
 *   BASE_URL         — URL base da aplicação (default: http://localhost:3000)
 *   SESSION_COOKIE   — Cookie de sessão Supabase Auth (para rotas protegidas)
 *   LOAD_TEST_USER   — Email do operador (para cenário de login)
 *   LOAD_TEST_PASS   — Senha do operador (para cenário de login)
 *   COMMIT_SHA       — SHA do commit atual (para tagging de métricas no CI/CD)
 *
 * Cenários disponíveis (executar individualmente):
 *   01-health-basic.js       — GET /api/health (público, sem auth)
 *   02-health-v1.js          — GET /api/v1/health (DB + Redis)
 *   03-login.js              — POST /api/auth/session (login + validação AUTH_001)
 *   04-knowledge-cases.js    — GET /api/knowledge/cases (base de conhecimento)
 *   05-knowledge-threshold.js — GET /api/knowledge/progress (threshold motor)
 *   06-themes-list.js        — GET /api/v1/themes (motor de temas, scoring)
 *   07-blog-public.js        — GET /blog + /api/blog-articles (SSG/ISR público)
 *   08-analytics-funnel.js   — GET /api/v1/analytics/funnel (operação pesada)
 *
 * Notas de CI/CD:
 *   k6 retorna exit code non-zero quando thresholds são violados.
 *   Integrar com /ci-cd-create como gate de performance no pipeline.
 *   Exemplo GitHub Actions:
 *     - run: k6 run --env COMMIT_SHA=${{ github.sha }} tests/load/scenarios/01-health-basic.js
 */

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js'
import { jUnit } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js'

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
    'tests/load/results/summary.json': JSON.stringify(data, null, 2),
    'tests/load/results/summary-junit.xml': jUnit(data),
  }
}
