#!/usr/bin/env tsx
/**
 * Auditoria de cobertura UTM — TASK-13 ST005 (CL-174)
 *
 * Escaneia arquivos de template/email/notification procurando links outbound
 * sem UTM. Reporta % de cobertura. Falha (exit 1) como warning gate se < 95%.
 */
import { globSync } from 'glob'
import { readFileSync } from 'fs'

const SCAN_GLOBS = [
  'src/lib/notifications/**/*.ts',
  'src/lib/templates/**/*.ts',
  'src/lib/alert-email.ts',
  'src/lib/services/email-alert.service.ts',
  'src/lib/blog/**/*.ts',
  'src/lib/instagram/**/*.ts',
]

const EXTERNAL_URL_RE = /https?:\/\/(?!app\.inbound-forge\.app|localhost)[^\s"'`>)]+/g
const UTM_TAGGED_RE = /utm_source=/

interface Finding {
  file: string
  line: number
  url: string
  hasUtm: boolean
}

const findings: Finding[] = []

for (const pattern of SCAN_GLOBS) {
  const files = globSync(pattern)
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const lines = content.split('\n')
    lines.forEach((line, idx) => {
      let match: RegExpExecArray | null
      EXTERNAL_URL_RE.lastIndex = 0
      while ((match = EXTERNAL_URL_RE.exec(line)) !== null) {
        const url = match[0].replace(/['"`,)>]+$/, '')
        // Skip API endpoints, CDN, font URLs, tracking pixels
        if (/resend\.com|supabase\.co|googleapis|gstatic|upstash|sentry|posthog|google-analytics|vercel\.live/.test(url)) continue
        findings.push({ file, line: idx + 1, url, hasUtm: UTM_TAGGED_RE.test(url) })
      }
    })
  }
}

const total = findings.length
const tagged = findings.filter((f) => f.hasUtm).length
const coverage = total === 0 ? 100 : Math.round((tagged / total) * 100)

console.log('\n=== Auditoria UTM Coverage ===')
console.log(`Total links outbound: ${total}`)
console.log(`Com UTM: ${tagged}`)
console.log(`Sem UTM: ${total - tagged}`)
console.log(`Cobertura: ${coverage}%`)

if (total - tagged > 0) {
  console.log('\nLinks sem UTM:')
  findings.filter((f) => !f.hasUtm).forEach((f) => {
    console.log(`  ${f.file}:${f.line} — ${f.url}`)
  })
}

if (coverage < 95) {
  console.warn(`\n⚠️  Cobertura UTM abaixo de 95% (${coverage}%). Adicionar withUtm() nos links acima.`)
  process.exit(1)
} else {
  console.log(`\n✓ Cobertura UTM OK (${coverage}%)`)
}
