/**
 * OpenAPI validator — verifica estrutura do openapi.yaml
 * Rastreabilidade: API-001, TASK-3/ST001
 * Uso: npx ts-node src/tests/api-contracts/openapi-validator.ts
 */
import fs from 'fs'
import path from 'path'

const OPENAPI_PATH = path.join(process.cwd(), 'docs/openapi.yaml')
const EXPECTED_MIN_PATHS = 47

async function validateOpenAPI(): Promise<void> {
  if (!fs.existsSync(OPENAPI_PATH)) {
    console.error(`ERRO: ${OPENAPI_PATH} não encontrado`)
    process.exit(1)
  }

  const content = fs.readFileSync(OPENAPI_PATH, 'utf-8')

  // Contar paths (linhas que iniciam com "  /")
  const pathLines = content.split('\n').filter(line => /^  \/\S/.test(line))
  const pathCount = pathLines.length

  console.log(`Paths encontrados: ${pathCount}`)

  if (pathCount < EXPECTED_MIN_PATHS) {
    console.warn(`AVISO: Esperado >= ${EXPECTED_MIN_PATHS} paths, encontrado ${pathCount}`)
  } else {
    console.log(`OK: ${pathCount} paths >= ${EXPECTED_MIN_PATHS} esperados`)
  }

  // Verificar campos obrigatórios
  if (!content.includes('openapi: 3')) {
    console.error('ERRO: Campo openapi ausente')
    process.exit(1)
  }

  if (!content.includes('lgpdConsent')) {
    console.warn('AVISO: Campo lgpdConsent não encontrado no openapi.yaml')
  }

  if (!content.includes('VAL_001')) {
    console.warn('AVISO: Código de erro VAL_001 não documentado')
  }

  if (!content.includes('AUTH_001')) {
    console.warn('AVISO: Código de erro AUTH_001 não documentado')
  }

  console.log('Validação estrutural concluída.')
}

validateOpenAPI().catch(console.error)
