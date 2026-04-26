/**
 * Cenário 5: Threshold do Motor de Temas
 * Endpoint: GET /api/knowledge/progress
 * Auth: Session cookie (operador autenticado)
 * SLO p95: 400ms | p99: 800ms
 * Fonte SLO: Default GET leitura
 *
 * Endpoint crítico: verificado no dashboard a cada carregamento
 * RNF-001/002: ≥5 entradas validadas ativa motor; exibe progresso visual
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
const thresholdDuration = new Trend('knowledge_threshold_duration')

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
  },
  thresholds: {
    http_req_duration: [`p(95)<${SLO_P95}`, `p(99)<${SLO_P99}`],
    errors: ['rate<0.01'],
    http_req_failed: ['rate<0.05'],
  },
  tags: {
    commit: __ENV.COMMIT_SHA || 'local',
    scenario: __ENV.SCENARIO || 'knowledge-threshold',
  },
}

export default function () {
  const headers = { 'Content-Type': 'application/json' }
  if (SESSION_COOKIE) {
    headers['Cookie'] = SESSION_COOKIE
  }

  const res = http.get(`${BASE_URL}/api/knowledge/progress`, { headers })

  thresholdDuration.add(res.timings.duration)

  const ok = check(res, {
    'threshold status 200 ou 401': (r) => r.status === 200 || r.status === 401,
    'threshold latência < SLO p95': (r) => r.timings.duration < SLO_P95,
  })

  if (res.status === 200) {
    check(res, {
      'threshold retorna contagem de cases e pains': (r) => {
        try {
          const body = JSON.parse(r.body)
          return (
            body.casesValidated !== undefined ||
            body.painsValidated !== undefined ||
            body.threshold !== undefined ||
            body.progress !== undefined
          )
        } catch {
          return false
        }
      },
    })
  }

  errorRate.add(!ok)
  sleep(1)
}
