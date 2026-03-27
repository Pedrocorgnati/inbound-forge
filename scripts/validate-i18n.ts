import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MESSAGES_DIR = path.join(__dirname, '../src/i18n/messages')
const BASE_LOCALE = 'pt-BR'
const LOCALES = ['en-US', 'it-IT', 'es-ES']

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? flattenKeys(v as Record<string, unknown>, prefix ? `${prefix}.${k}` : k)
      : [prefix ? `${prefix}.${k}` : k]
  )
}

const baseMessages: Record<string, unknown> = JSON.parse(
  fs.readFileSync(path.join(MESSAGES_DIR, `${BASE_LOCALE}.json`), 'utf-8')
)
const baseKeys = new Set(flattenKeys(baseMessages))

console.log(`[${BASE_LOCALE}] Base — ${baseKeys.size} chaves\n`)

let hasErrors = false

for (const locale of LOCALES) {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`)

  if (!fs.existsSync(filePath)) {
    console.error(`[${locale}] ERRO: arquivo não encontrado em ${filePath}`)
    hasErrors = true
    continue
  }

  const messages: Record<string, unknown> = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const localeKeys = new Set(flattenKeys(messages))

  const missing = Array.from(baseKeys).filter((k) => !localeKeys.has(k))
  const extra = Array.from(localeKeys).filter((k) => !baseKeys.has(k))

  if (missing.length > 0) {
    console.error(`[${locale}] Chaves faltando (${missing.length}):`)
    missing.forEach((k) => console.error(`  - ${k}`))
    hasErrors = true
  }

  if (extra.length > 0) {
    console.warn(`[${locale}] Chaves extras (${extra.length}):`)
    extra.forEach((k) => console.warn(`  + ${k}`))
  }

  if (missing.length === 0 && extra.length === 0) {
    console.log(`[${locale}] OK — ${localeKeys.size} chaves`)
  }
}

if (hasErrors) {
  console.error('\nValidação falhou. Corrija as chaves faltando antes do deploy.')
  process.exit(1)
} else {
  console.log('\nTodos os locales estão completos.')
}
