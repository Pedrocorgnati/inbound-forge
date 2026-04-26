// Intake-Review TASK-21 ST005 (CL-IN-007): smoke test do Browserless.
// Skippa sem BROWSERLESS_URL (permite CI sem conta).
// Valida: conexao + goto + screenshot base64.
import { describe, it, expect } from 'vitest'

const BROWSERLESS_URL = process.env.BROWSERLESS_URL
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN

const itif = (cond: boolean) => (cond ? it : it.skip)

describe('Browserless smoke (CL-IN-007)', () => {
  itif(!!BROWSERLESS_URL)(
    'executa goto + screenshot em exemplo publico',
    async () => {
      const url = BROWSERLESS_URL as string
      const token = BROWSERLESS_TOKEN
      const endpoint = token
        ? `${url.replace(/\/$/, '')}/screenshot?token=${encodeURIComponent(token)}`
        : `${url.replace(/\/$/, '')}/screenshot`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url: 'https://example.com',
          options: { fullPage: false, type: 'png' },
          gotoOptions: { waitUntil: 'domcontentloaded', timeout: 15000 },
        }),
      })

      expect(res.ok, `Browserless HTTP ${res.status}`).toBe(true)
      const buf = Buffer.from(await res.arrayBuffer())
      expect(buf.length).toBeGreaterThan(1024)
    },
    20_000,
  )
})
