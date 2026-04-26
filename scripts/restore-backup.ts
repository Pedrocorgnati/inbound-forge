/**
 * Intake-Review TASK-5 (CL-322): script de restore de backup Supabase com
 * smoke test. Uso:
 *
 *   SUPABASE_BACKUP_PATH=/path/to/dump.sql \
 *   TEST_DATABASE_URL=postgresql://... \
 *   pnpm tsx scripts/restore-backup.ts
 *
 * Retorna exit code 0 em sucesso, 1 em falha. Documentado em docs/RESTORE-RUNBOOK.md.
 */
import { execSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'

type Result = { ok: true } | { ok: false; reason: string }

function assertEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`[restore-backup] Variavel ${name} nao definida`)
    process.exit(1)
  }
  return value
}

function runRestore(dumpPath: string, testDbUrl: string): Result {
  if (!existsSync(dumpPath)) return { ok: false, reason: `dump nao encontrado: ${dumpPath}` }
  const size = statSync(dumpPath).size
  console.log(`[restore-backup] dump=${dumpPath} (${(size / 1024 / 1024).toFixed(1)} MB)`)

  try {
    execSync(`psql "${testDbUrl}" < "${dumpPath}"`, { stdio: 'inherit' })
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: `psql falhou: ${err instanceof Error ? err.message : 'erro desconhecido'}` }
  }
}

async function smokeTest(testDbUrl: string): Promise<Result> {
  const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } })
  try {
    const [articleCount, leadCount] = await Promise.all([
      prisma.blogArticle.count(),
      prisma.lead.count(),
    ])
    console.log(`[restore-backup] BlogArticle=${articleCount} Lead=${leadCount}`)
    if (articleCount <= 0 && leadCount <= 0) {
      return { ok: false, reason: 'banco restaurado esta vazio — backup possivelmente corrompido' }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: `smoke falhou: ${err instanceof Error ? err.message : 'erro'}` }
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  const dumpPath = assertEnv('SUPABASE_BACKUP_PATH')
  const testDbUrl = assertEnv('TEST_DATABASE_URL')

  console.log('[restore-backup] Iniciando restore...')
  const restore = runRestore(dumpPath, testDbUrl)
  if (!restore.ok) {
    console.error('[restore-backup] FALHA:', restore.reason)
    process.exit(1)
  }

  console.log('[restore-backup] Rodando smoke test...')
  const smoke = await smokeTest(testDbUrl)
  if (!smoke.ok) {
    console.error('[restore-backup] SMOKE FALHOU:', smoke.reason)
    process.exit(1)
  }

  console.log('[restore-backup] OK — restore + smoke test passaram')
  process.exit(0)
}

main().catch((err) => {
  console.error('[restore-backup] Erro fatal:', err)
  process.exit(1)
})
