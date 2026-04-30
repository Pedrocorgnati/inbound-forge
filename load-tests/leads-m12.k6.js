/**
 * PA-08 — Load test M12: Leads e Conversões
 * Target: 1000+ leads simultâneos < 500ms p95
 *
 * Pré-requisitos:
 *   k6 instalado: https://grafana.com/docs/k6/latest/set-up/install-k6/
 *   Ambiente de staging com DB populado
 *
 * Execução:
 *   k6 run --env BASE_URL=https://staging.inbound-forge.app \
 *           --env SESSION_COOKIE="next-auth.session-token=xxx" \
 *           load-tests/leads-m12.k6.js
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend, Counter } from 'k6/metrics'

const leadsP95 = new Trend('leads_list_p95')
const kanbanP95 = new Trend('kanban_p95')
const createLatency = new Trend('lead_create_latency')
const errors = new Counter('api_errors')

export const options = {
  stages: [
    { duration: '30s', target: 50 },    // ramp up
    { duration: '2m', target: 200 },   // sustain 200 VUs
    { duration: '1m', target: 500 },   // spike
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    leads_list_p95: ['p(95)<500'],  // PA-08 target: < 500ms p95
    kanban_p95: ['p(95)<800'],
    lead_create_latency: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],  // menos de 1% de erros
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const COOKIE = __ENV.SESSION_COOKIE || ''

const HEADERS = {
  'Content-Type': 'application/json',
  Cookie: COOKIE,
}

export default function () {
  const scenario = Math.random()

  if (scenario < 0.5) {
    // 50% — listagem de leads (GET /api/v1/leads)
    const start = Date.now()
    const res = http.get(`${BASE_URL}/api/v1/leads?limit=100&page=1`, { headers: HEADERS })
    leadsP95.add(Date.now() - start)
    const ok = check(res, {
      'leads list 200': (r) => r.status === 200,
      'leads list has data': (r) => {
        try {
          const body = JSON.parse(r.body)
          return Array.isArray(body.data) || Array.isArray(body.items)
        } catch {
          return false
        }
      },
    })
    if (!ok) errors.add(1)

  } else if (scenario < 0.8) {
    // 30% — kanban (GET /api/v1/leads?limit=100 sem filtros)
    const start = Date.now()
    const res = http.get(`${BASE_URL}/api/v1/leads?limit=100`, { headers: HEADERS })
    kanbanP95.add(Date.now() - start)
    check(res, { 'kanban 200': (r) => r.status === 200 })

  } else {
    // 20% — criação de lead (POST /api/v1/leads)
    const payload = JSON.stringify({
      name: `Load Test User ${__VU}-${__ITER}`,
      contactInfo: `loadtest+${__VU}${__ITER}@example.com`,
      lgpdConsent: true,
      lgpdConsentAt: new Date().toISOString(),
      channel: 'BLOG',
      funnelStage: 'AWARENESS',
      firstTouchAt: new Date().toISOString(),
    })
    const start = Date.now()
    const res = http.post(`${BASE_URL}/api/v1/leads`, payload, { headers: HEADERS })
    createLatency.add(Date.now() - start)
    const ok = check(res, {
      'lead created 201 or 409': (r) => r.status === 201 || r.status === 409,
    })
    if (!ok) errors.add(1)
  }

  sleep(Math.random() * 0.5 + 0.1) // 100-600ms think time
}

export function handleSummary(data) {
  return {
    'load-tests/leads-m12-results.json': JSON.stringify(data, null, 2),
    stdout: `
=== M12 Load Test Summary ===
Leads list p95:  ${data.metrics.leads_list_p95?.values?.['p(95)']?.toFixed(0) ?? 'N/A'}ms (target <500ms)
Kanban p95:      ${data.metrics.kanban_p95?.values?.['p(95)']?.toFixed(0) ?? 'N/A'}ms (target <800ms)
Create p95:      ${data.metrics.lead_create_latency?.values?.['p(95)']?.toFixed(0) ?? 'N/A'}ms (target <1000ms)
Error rate:      ${((data.metrics.http_req_failed?.values?.rate ?? 0) * 100).toFixed(2)}%
Total requests:  ${data.metrics.http_reqs?.values?.count ?? 0}
`,
  }
}
