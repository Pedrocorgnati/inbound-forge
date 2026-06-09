/**
 * OB-OBS-03 guard — todo cron declarado em vercel.json deve expor um handler GET,
 * porque o Vercel Cron dispara requisicoes GET. Um handler POST-only retorna 405
 * e o cron NUNCA executa (foi o caso de budget-check/rescraping/reconciliation).
 *
 * Checagem ao nivel de fonte (sem importar os modulos de rota) para evitar
 * side-effects de import (prisma/redis no topo dos workers).
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')) as {
  crons?: Array<{ path: string }>
}
const cronPaths = (vercel.crons ?? [])
  .map((c) => c.path)
  .filter((p) => p.startsWith('/api/cron/'))

describe('Vercel cron handlers expoem GET (OB-OBS-03)', () => {
  it('vercel.json declara crons em /api/cron/*', () => {
    expect(cronPaths.length).toBeGreaterThan(0)
  })

  for (const p of cronPaths) {
    const name = p.replace('/api/cron/', '')
    const file = path.join(ROOT, 'src/app/api/cron', name, 'route.ts')
    it(`${p} -> route.ts exporta GET`, () => {
      expect(fs.existsSync(file), `arquivo de rota ausente: ${file}`).toBe(true)
      const src = fs.readFileSync(file, 'utf8')
      expect(
        /export\s+(async\s+)?function\s+GET\b/.test(src),
        `${p} deve exportar GET (Vercel Cron dispara GET, nao POST)`,
      ).toBe(true)
    })
  }
})
