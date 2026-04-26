/**
 * Cenário 1: Health Check Básico
 * Endpoint: GET /api/health
 * Auth: Não requerida
 * SLO p95: 500ms | p99: 1000ms
 * Fonte SLO: PRD RNF — Healthcheck API < 500ms
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

const errorRate = new Rate('errors')
const healthDuration = new Trend('health_basic_duration')

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
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
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
    scenario: __ENV.SCENARIO || 'health-basic',
  },
}

export default function () {
  const res = http.get(`${BASE_URL}/api/health`)

  healthDuration.add(res.timings.duration)

  const ok = check(res, {
    'health status 200': (r) => r.status === 200,
    'health latência < SLO p95': (r) => r.timings.duration < SLO_P95,
    'health tem status field': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.status !== undefined
      } catch {
        return false
      }
    },
  })

  errorRate.add(!ok)
  sleep(1)
}
