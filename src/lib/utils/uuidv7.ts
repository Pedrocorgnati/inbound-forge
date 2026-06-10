/**
 * loop 05-27 TAREFA-008 (fix REPROVADO): gerador de UUID v7 (RFC 9562) para chaves
 * Idempotency-Key. Funciona no browser e no Node (globalThis.crypto). O middleware
 * de idempotencia (src/lib/idempotency/middleware.ts) exige exatamente este formato:
 * 48 bits de timestamp ms + versao 7 + variante 10b. Sem dependencia externa (o
 * projeto nao tem o pacote `uuid`).
 */
export function uuidv7(): string {
  const ts = Date.now()
  const bytes = new Uint8Array(16)

  // 48 bits de timestamp (ms) big-endian em bytes[0..5]
  bytes[0] = Math.floor(ts / 2 ** 40) & 0xff
  bytes[1] = Math.floor(ts / 2 ** 32) & 0xff
  bytes[2] = Math.floor(ts / 2 ** 24) & 0xff
  bytes[3] = Math.floor(ts / 2 ** 16) & 0xff
  bytes[4] = Math.floor(ts / 2 ** 8) & 0xff
  bytes[5] = ts & 0xff

  // 10 bytes aleatorios para o restante
  const rand = new Uint8Array(10)
  crypto.getRandomValues(rand)
  bytes.set(rand, 6)

  // versao 7 (nibble alto do byte 6) e variante 10b (bits altos do byte 8)
  bytes[6] = (bytes[6] & 0x0f) | 0x70
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
