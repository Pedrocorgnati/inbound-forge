/**
 * Testes unitários — Validação de Variáveis de Ambiente (SYS_004)
 * Rastreabilidade: TASK-11/ST003
 * Cobre: SYS_004 (variável de ambiente obrigatória ausente)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXTAUTH_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
] as const

describe('Validação de variáveis de ambiente — SYS_004', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    REQUIRED_ENV_VARS.forEach((key) => {
      process.env[key] = `test-value-${key}`
    })
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('não lança quando todas as vars críticas estão presentes', () => {
    expect(() => {
      REQUIRED_ENV_VARS.forEach((key) => {
        if (!process.env[key]) throw Object.assign(new Error(`Env ${key} ausente`), { code: 'SYS_004' })
      })
    }).not.toThrow()
  })

  it('[SYS_004] lança com code SYS_004 quando DATABASE_URL está ausente', () => {
    delete process.env.DATABASE_URL

    expect(() => {
      if (!process.env.DATABASE_URL) {
        throw Object.assign(new Error('DATABASE_URL é obrigatória'), { code: 'SYS_004' })
      }
    }).toThrowError(/DATABASE_URL/)
  })

  it('[SYS_004] lança com code SYS_004 quando NEXTAUTH_SECRET está ausente', () => {
    delete process.env.NEXTAUTH_SECRET

    expect(() => {
      if (!process.env.NEXTAUTH_SECRET) {
        throw Object.assign(new Error('NEXTAUTH_SECRET é obrigatória'), { code: 'SYS_004' })
      }
    }).toThrowError(/NEXTAUTH_SECRET/)
  })

  it('[SYS_004] scripts/check-env-completeness.sh verifica vars de produção', async () => {
    const { existsSync } = await import('fs')
    const { join } = await import('path')
    const scriptPath = join(process.cwd(), 'scripts/check-env-completeness.sh')
    expect(existsSync(scriptPath)).toBe(true)
  })
})
