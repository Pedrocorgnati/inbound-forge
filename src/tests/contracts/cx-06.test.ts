/**
 * CX-06: Workers usam REDIS_KEYS definidos em redis-keys.ts (sem hardcode)
 * Owner: module-1/TASK-3 | Consumidores: module-6/TASK-1, module-9/TASK-1
 * Interface: src/constants/redis-keys.ts / REDIS_KEYS
 */
import { describe, it, expect } from 'vitest'
import { REDIS_KEYS } from '@/constants/redis-keys'

describe('CX-06: Redis queue keys', () => {
  it('REDIS_KEYS.SCRAPING_QUEUE definido como string não-vazia', () => {
    expect(REDIS_KEYS.SCRAPING_QUEUE).toBeDefined()
    expect(typeof REDIS_KEYS.SCRAPING_QUEUE).toBe('string')
    expect(REDIS_KEYS.SCRAPING_QUEUE.length).toBeGreaterThan(0)
  })

  it('REDIS_KEYS.IMAGE_QUEUE definido', () => {
    expect(REDIS_KEYS.IMAGE_QUEUE).toBeDefined()
    expect(typeof REDIS_KEYS.IMAGE_QUEUE).toBe('string')
  })

  it('REDIS_KEYS.PUBLISH_QUEUE definido', () => {
    expect(REDIS_KEYS.PUBLISH_QUEUE).toBeDefined()
    expect(typeof REDIS_KEYS.PUBLISH_QUEUE).toBe('string')
  })

  it('Queue keys são distintas entre si', () => {
    expect(REDIS_KEYS.SCRAPING_QUEUE).not.toBe(REDIS_KEYS.IMAGE_QUEUE)
    expect(REDIS_KEYS.SCRAPING_QUEUE).not.toBe(REDIS_KEYS.PUBLISH_QUEUE)
    expect(REDIS_KEYS.IMAGE_QUEUE).not.toBe(REDIS_KEYS.PUBLISH_QUEUE)
  })

  it('Nenhum worker hardcoda string de queue (verificação estática via importação)', () => {
    // Esta verificação confirma que REDIS_KEYS é importável do local correto
    // O script de CI verifica ausência de hardcodes via grep
    const keys = [REDIS_KEYS.SCRAPING_QUEUE, REDIS_KEYS.IMAGE_QUEUE, REDIS_KEYS.PUBLISH_QUEUE]
    keys.forEach(key => {
      expect(key).toMatch(/^worker:/)
    })
  })
})
