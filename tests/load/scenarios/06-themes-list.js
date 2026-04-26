/**
 * Cenário 6: Motor de Temas — Listagem
 * Endpoint: GET /api/v1/themes
 * Auth: Session cookie (operador autenticado)
 * SLO p95: 400ms | p99: 800ms
 * Fonte SLO: Default GET leitura
 *
 * Endpoint do motor de temas com opportunityScore calculado.
 * Gargalo potencial: query com JOIN e ordenação por score (Rock 1).
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
const themesDuration = new Trend('themes_list_duration')

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
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 20,
      maxVUs: 50,
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
    scenario: __ENV.SCENARIO || 'themes-list',
  },
}

export default function () {
  const headers = { 'Content-Type': 'application/json' }
  if (SESSION_COOKIE) {
    headers['Cookie'] = SESSION_COOKIE
  }

  const res = http.get(`${BASE_URL}/api/v1/themes`, { headers })

  themesDuration.add(res.timings.duration)

  const ok = check(res, {
    'themes status 200 ou 401': (r) => r.status === 200 || r.status === 401,
    'themes latência < SLO p95': (r) => r.timings.duration < SLO_P95,
  })

  if (res.status === 200) {
    check(res, {
      'themes retorna dados': (r) => {
        try {
          const body = JSON.parse(r.body)
          return Array.isArray(body) || Array.isArray(body.data) || body.themes !== undefined
        } catch {
          return false
        }
      },
    })
  }

  errorRate.add(!ok)
  sleep(1)
}
