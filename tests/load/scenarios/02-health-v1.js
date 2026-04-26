/**
 * Cenário 2: Health Check Detalhado (DB + Redis)
 * Endpoint: GET /api/v1/health
 * Auth: Session cookie (operador autenticado)
 * SLO p95: 500ms | p99: 1000ms
 * Fonte SLO: PRD RNF — Healthcheck API < 500ms (inclui ping DB + Redis)
 *
 * Nota: Usa cookie de sessão Supabase. Definir SESSION_COOKIE no env.
 * Exemplo: k6 run --env SESSION_COOKIE="sb-access-token=..." scenarios/02-health-v1.js
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const SESSION_COOKIE = __ENV.SESSION_COOKIE || ''

const errorRate = new Rate('errors')
const healthV1Duration = new Trend('health_v1_duration')

const SLO_P95 = 500
const SLO_P99 = 1000

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
        { duration: '2m', target: 5 },
        { duration: '5m', target: 5 },
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
    scenario: __ENV.SCENARIO || 'health-v1',
  },
}

export default function () {
  const headers = {
    'Content-Type': 'application/json',
  }
  if (SESSION_COOKIE) {
    headers['Cookie'] = SESSION_COOKIE
  }

  const res = http.get(`${BASE_URL}/api/v1/health`, { headers })

  healthV1Duration.add(res.timings.duration)

  const ok = check(res, {
    'health-v1 status 200 ou 401': (r) => r.status === 200 || r.status === 401,
    'health-v1 latência < SLO p95': (r) => r.timings.duration < SLO_P95,
  })

  // Validação de erros do ERROR-CATALOG: SYS_001 não deve aparecer no health
  check(res, {
    'health-v1 sem erro SYS_001': (r) => {
      try {
        const body = JSON.parse(r.body)
        return !body.code || body.code !== 'SYS_001'
      } catch {
        return true
      }
    },
  })

  errorRate.add(!ok)
  sleep(1)
}
