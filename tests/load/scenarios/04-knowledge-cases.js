/**
 * Cenário 4: Base de Conhecimento — Cases
 * Endpoint: GET /api/knowledge/cases
 * Auth: Session cookie (operador autenticado)
 * SLO p95: 400ms | p99: 800ms
 * Fonte SLO: Default GET leitura
 *
 * Gargalo identificado: endpoint crítico para ativação do motor de temas
 * (RNF-001: ≥ 5 entradas validadas para ativar motor)
 *
 * Variáveis de ambiente:
 *   SESSION_COOKIE — cookie de sessão Supabase (obrigatório para rotas protegidas)
 *   Formato: "sb-access-token=<token>"
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const SESSION_COOKIE = __ENV.SESSION_COOKIE || ''

const errorRate = new Rate('errors')
const casesDuration = new Trend('knowledge_cases_duration')

const SLO_P95 = 400
const SLO_P99 = 800

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { scenario: 'smoke' },
    },
    average_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 10 },
        { duration: '2m', target: 0 },
      ],
      startTime: '1m',
      tags: { scenario: 'average_load' },
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 30 },
        { duration: '5m', target: 30 },
        { duration: '2m', target: 0 },
      ],
      startTime: '10m',
      tags: { scenario: 'stress' },
    },
  },
  thresholds: {
    http_req_duration: [`p(95)<${SLO_P95}`, `p(99)<${SLO_P99}`],
    errors: ['rate<0.01'],
    http_req_failed: ['rate<0.05'],
  },
  tags: {
    commit: __ENV.COMMIT_SHA || 'local',
    scenario: __ENV.SCENARIO || 'knowledge-cases',
  },
}

export default function () {
  const headers = { 'Content-Type': 'application/json' }
  if (SESSION_COOKIE) {
    headers['Cookie'] = SESSION_COOKIE
  }

  // GET listagem de cases
  const res = http.get(`${BASE_URL}/api/knowledge/cases`, { headers })

  casesDuration.add(res.timings.duration)

  const ok = check(res, {
    'cases status 200 ou 401': (r) => r.status === 200 || r.status === 401,
    'cases latência < SLO p95': (r) => r.timings.duration < SLO_P95,
  })

  if (res.status === 200) {
    check(res, {
      'cases retorna array': (r) => {
        try {
          const body = JSON.parse(r.body)
          return Array.isArray(body) || Array.isArray(body.data)
        } catch {
          return false
        }
      },
    })
  }

  // Sem autenticação → deve retornar 401 (AUTH_001), não 500
  if (!SESSION_COOKIE) {
    check(res, {
      'sem auth → 401 não 500': (r) => r.status === 401,
    })
  }

  errorRate.add(!ok)
  sleep(1)
}
