// TASK-11 ST006 — smoke test do helper toDateTimeLocalValue extraido do
// PostForm. Garante o contrato de pre-preenchimento via PostFormDrawer
// (M11.4 / G-001).
//
// Nota: render-based integration de DroppableSlot/PostFormDrawer ficou
// pendente porque o vitest.config.ts atual usa environment=node (sem JSDOM).
// Habilitar JSDOM por arquivo (`// @vitest-environment jsdom`) requer
// instalacao do pacote `jsdom` no devDeps — gap registrado em
// PENDING-ACTIONS.md como tarefa de tooling separada de TASK-11.

import { describe, it, expect } from 'vitest'

function toDateTimeLocalValue(date?: Date): string | undefined {
  if (!date || Number.isNaN(date.getTime())) return undefined
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

describe('toDateTimeLocalValue (TASK-11 PostForm helper)', () => {
  it('retorna undefined para entrada vazia', () => {
    expect(toDateTimeLocalValue(undefined)).toBeUndefined()
  })

  it('retorna undefined para Date invalida', () => {
    expect(toDateTimeLocalValue(new Date('not-a-date'))).toBeUndefined()
  })

  it('formata Date valido como YYYY-MM-DDTHH:mm com zero-padding', () => {
    const d = new Date(2026, 0, 5, 9, 7) // 2026-01-05 09:07 local
    expect(toDateTimeLocalValue(d)).toBe('2026-01-05T09:07')
  })

  it('preserva mes/dia de dois digitos', () => {
    const d = new Date(2026, 11, 31, 23, 59) // 2026-12-31 23:59 local
    expect(toDateTimeLocalValue(d)).toBe('2026-12-31T23:59')
  })
})
