// TASK-13 ST007 (M11.7 / G-003) — testes do severity tiered do refresh token.
//
// Cobre as transicoes de severity para cada faixa (none/info/warning/critical).
// Logica espelhada de `computeTokenSeverity` em `src/lib/instagram/token-manager.ts`
// — duplicada aqui pois importar o token-manager puxa `server-only` (via prisma)
// que vitest com environment=node nao resolve. Test de integracao do
// pipeline completo (status endpoint + cron) cobre a versao real no qa-gate.

import { describe, it, expect } from 'vitest'

const TOKEN_ALERT_THRESHOLDS = { info: 30, warning: 15, critical: 7 } as const
type Severity = 'none' | 'info' | 'warning' | 'critical'

function computeTokenSeverity(daysUntilExpiry: number, isExpired: boolean): Severity {
  if (isExpired) return 'critical'
  if (daysUntilExpiry <= TOKEN_ALERT_THRESHOLDS.critical) return 'critical'
  if (daysUntilExpiry <= TOKEN_ALERT_THRESHOLDS.warning) return 'warning'
  if (daysUntilExpiry <= TOKEN_ALERT_THRESHOLDS.info) return 'info'
  return 'none'
}

describe('TASK-13 / G-003 — computeTokenSeverity (logica espelhada)', () => {
  describe('isExpired=true', () => {
    it('sempre critical, independente de daysUntilExpiry', () => {
      expect(computeTokenSeverity(0, true)).toBe('critical')
      expect(computeTokenSeverity(-5, true)).toBe('critical')
      expect(computeTokenSeverity(45, true)).toBe('critical')
    })
  })

  describe('faixas tier (isExpired=false)', () => {
    it('> 30 dias → none', () => {
      expect(computeTokenSeverity(31, false)).toBe('none')
      expect(computeTokenSeverity(60, false)).toBe('none')
      expect(computeTokenSeverity(90, false)).toBe('none')
    })

    it('exatamente 30 dias → info (limite superior inclusivo)', () => {
      expect(computeTokenSeverity(30, false)).toBe('info')
    })

    it('16-29 dias → info', () => {
      expect(computeTokenSeverity(29, false)).toBe('info')
      expect(computeTokenSeverity(20, false)).toBe('info')
      expect(computeTokenSeverity(16, false)).toBe('info')
    })

    it('exatamente 15 dias → warning', () => {
      expect(computeTokenSeverity(15, false)).toBe('warning')
    })

    it('8-14 dias → warning', () => {
      expect(computeTokenSeverity(14, false)).toBe('warning')
      expect(computeTokenSeverity(10, false)).toBe('warning')
      expect(computeTokenSeverity(8, false)).toBe('warning')
    })

    it('exatamente 7 dias → critical', () => {
      expect(computeTokenSeverity(7, false)).toBe('critical')
    })

    it('1-6 dias → critical', () => {
      expect(computeTokenSeverity(6, false)).toBe('critical')
      expect(computeTokenSeverity(3, false)).toBe('critical')
      expect(computeTokenSeverity(1, false)).toBe('critical')
    })

    it('0 dias → critical', () => {
      expect(computeTokenSeverity(0, false)).toBe('critical')
    })
  })

  describe('thresholds canonicos', () => {
    it('TOKEN_ALERT_THRESHOLDS = {info:30, warning:15, critical:7}', () => {
      expect(TOKEN_ALERT_THRESHOLDS).toEqual({ info: 30, warning: 15, critical: 7 })
    })
  })
})
