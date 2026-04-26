#!/usr/bin/env node
// TASK-10 ST001 (CL-207): falha o CI se o diretorio .next/ ultrapassar o
// threshold (default 50MB, configuravel via THRESHOLD_MB).

import { statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DEFAULT_THRESHOLD_MB = 50
const NEXT_DIR = process.env.NEXT_DIR ?? '.next'
const THRESHOLD_MB = Number(process.env.THRESHOLD_MB ?? DEFAULT_THRESHOLD_MB)
const THRESHOLD_BYTES = THRESHOLD_MB * 1024 * 1024

function walk(dir: string): number {
  let total = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'cache') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) total += walk(full)
    else {
      try {
        total += statSync(full).size
      } catch {
        // ignore
      }
    }
  }
  return total
}

try {
  const bytes = walk(NEXT_DIR)
  const mb = bytes / 1024 / 1024
  const pct = (mb / THRESHOLD_MB) * 100
  console.log(`[bundle-size] ${mb.toFixed(2)}MB / ${THRESHOLD_MB}MB (${pct.toFixed(1)}%)`)
  if (bytes > THRESHOLD_BYTES) {
    console.error(`[bundle-size] FAIL: excedeu o limite de ${THRESHOLD_MB}MB.`)
    process.exit(1)
  }
  console.log('[bundle-size] OK')
} catch (err) {
  console.error('[bundle-size] erro ao medir:', err instanceof Error ? err.message : err)
  process.exit(2)
}
