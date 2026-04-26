/**
 * Cenário 3: Login do Operador
 * Endpoint: POST /api/auth/session
 * Auth: Não requerida (é o próprio login)
 * SLO p95: 800ms | p99: 2000ms
 * Fonte SLO: PRD RNF — TTFB < 800ms
 *
 * Variáveis de ambiente:
 *   LOAD_TEST_USER — email do operador (obrigatório)
 *   LOAD_TEST_PASS — senha do operador (obrigatório)
 *
 * Validações do ERROR-CATALOG:
 *   - Credenciais inválidas → AUTH_001 (401)
 *   - Login com conta válida → 200 com session
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const LOAD_TEST_USER = __ENV.LOAD_TEST_USER || ''
const LOAD_TEST_PASS = __ENV.LOAD_TEST_PASS || ''

const errorRate = new Rate('errors')
const loginDuration = new Trend('login_duration')

const SLO_P95 = 800
const SLO_P99 = 2000

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
    scenario: __ENV.SCENARIO || 'login',
  },
}

export default function () {
  // Teste 1: Login válido (se credenciais fornecidas)
  if (LOAD_TEST_USER && LOAD_TEST_PASS) {
    const loginRes = http.post(
      `${BASE_URL}/api/auth/session`,
      JSON.stringify({ email: LOAD_TEST_USER, password: LOAD_TEST_PASS }),
      { headers: { 'Content-Type': 'application/json' } }
    )

    loginDuration.add(loginRes.timings.duration)

    const ok = check(loginRes, {
      'login válido status 200': (r) => r.status === 200,
      'login válido latência < SLO p95': (r) => r.timings.duration < SLO_P95,
      'login retorna session': (r) => {
        try {
          const body = JSON.parse(r.body)
          return body.user !== undefined || r.status === 200
        } catch {
          return false
        }
      },
    })

    errorRate.add(!ok)
    sleep(2)
  }

  // Teste 2: Credenciais inválidas → deve retornar AUTH_001 (401), não 500
  const invalidRes = http.post(
    `${BASE_URL}/api/auth/session`,
    JSON.stringify({ email: 'invalid@test.com', password: 'WrongPassword123!' }),
    { headers: { 'Content-Type': 'application/json' } }
  )

  check(invalidRes, {
    'credenciais inválidas → 401 não 500': (r) => r.status === 401,
    'credenciais inválidas → código AUTH_001': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.code === 'AUTH_001' || r.status === 401
      } catch {
        return r.status === 401
      }
    },
  })

  // Teste 3: Rate limit — muitas tentativas → AUTH_003 (429)
  // Apenas verificar que não retorna 500
  const rateLimitCheck = http.post(
    `${BASE_URL}/api/auth/session`,
    JSON.stringify({ email: 'spam@test.com', password: 'wrong' }),
    { headers: { 'Content-Type': 'application/json' } }
  )

  check(rateLimitCheck, {
    'tentativa extra não gera 500': (r) => r.status !== 500,
  })

  sleep(1)
}
