/**
 * Cenário 7: Blog Público (SSG/ISR)
 * Endpoint: GET /api/blog-articles (listagem) + GET /blog (página)
 * Auth: Não requerida (rota pública)
 * SLO p95: 500ms | p99: 1000ms
 * Fonte SLO: PRD RNF TTFB < 800ms + ADR-0005 ISR
 *
 * Rota pública — deve funcionar MESMO com Supabase indisponível (SSG/ISR)
 * Este é o cenário de maior volume externo caso indexado pelo Google.
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

const errorRate = new Rate('errors')
const blogDuration = new Trend('blog_public_duration')

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
        { duration: '2m', target: 20 },
        { duration: '5m', target: 20 },
        { duration: '2m', target: 0 },
      ],
      startTime: '1m',
      tags: { scenario: 'average_load' },
    },
    stress: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 150,
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
    scenario: __ENV.SCENARIO || 'blog-public',
  },
}

export default function () {
  // GET API de artigos (pública)
  const apiRes = http.get(`${BASE_URL}/api/blog-articles`)
  blogDuration.add(apiRes.timings.duration)

  const apiOk = check(apiRes, {
    'blog-articles status 200': (r) => r.status === 200,
    'blog-articles latência < SLO p95': (r) => r.timings.duration < SLO_P95,
    'blog-articles sem erro 5xx': (r) => r.status < 500,
  })

  errorRate.add(!apiOk)
  sleep(0.5)

  // GET página /blog (HTML — SSG)
  const pageRes = http.get(`${BASE_URL}/blog`, {
    headers: { Accept: 'text/html' },
  })
  blogDuration.add(pageRes.timings.duration)

  const pageOk = check(pageRes, {
    'blog page status 200 ou 304': (r) => r.status === 200 || r.status === 304,
    'blog page latência < SLO p95': (r) => r.timings.duration < SLO_P95,
    'blog page sem erro 5xx': (r) => r.status < 500,
  })

  errorRate.add(!pageOk)
  sleep(1)
}
