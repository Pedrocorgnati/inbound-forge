/**
 * Cenário 8: Analytics — Funil de Conversão
 * Endpoint: GET /api/v1/analytics/funnel
 * Auth: Session cookie (operador autenticado)
 * SLO p95: 2000ms | p99: 5000ms
 * Fonte SLO: Default operação de agregação/relatório
 *
 * Endpoint mais pesado — agrega dados de conversão, atribuição e funil.
 * Executado manualmente pelo operador ao revisar performance semanal.
 * Volume baixo mas latência aceitável maior.
 *
 * Variáveis de ambiente:
 *   SESSION_COOKIE — cookie de sessão Supabase
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const SESSION_COOKIE = __ENV.SESSION_COOKIE || ''

const errorRate = new Rate('errors')
const funnelDuration = new Trend('analytics_funnel_duration')

const SLO_P95 = 2000
const SLO_P99 = 5000

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
        { duration: '2m', target: 3 },
        { duration: '5m', target: 3 },
        { duration: '2m', target: 0 },
      ],
      startTime: '1m',
      tags: { scenario: 'average_load' },
    },
  },
  thresholds: {
    http_req_duration: [`p(95)<${SLO_P95}`, `p(99)<${SLO_P99}`],
    errors: ['rate<0.01'],
    http_req_failed: ['rate<0.05'],
  },
  tags: {
    commit: __ENV.COMMIT_SHA || 'local',
    scenario: __ENV.SCENARIO || 'analytics-funnel',
  },
}

export default function () {
  const headers = { 'Content-Type': 'application/json' }
  if (SESSION_COOKIE) {
    headers['Cookie'] = SESSION_COOKIE
  }

  const res = http.get(`${BASE_URL}/api/v1/analytics/funnel`, { headers })

  funnelDuration.add(res.timings.duration)

  const ok = check(res, {
    'analytics-funnel status 200 ou 401': (r) => r.status === 200 || r.status === 401,
    'analytics-funnel latência < SLO p95': (r) => r.timings.duration < SLO_P95,
    'analytics-funnel sem timeout 504': (r) => r.status !== 504,
  })

  if (res.status === 200) {
    check(res, {
      'analytics-funnel retorna dados de funil': (r) => {
        try {
          const body = JSON.parse(r.body)
          return (
            body.awareness !== undefined ||
            body.consideration !== undefined ||
            body.decision !== undefined ||
            body.funnel !== undefined ||
            body.data !== undefined
          )
        } catch {
          return false
        }
      },
    })
  }

  errorRate.add(!ok)
  sleep(2)
}
