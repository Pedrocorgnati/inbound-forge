/**
 * Distributed Lock via Redis (Upstash)
 * Rastreabilidade: nextjs:scalability T006
 *
 * Previne race conditions em operações críticas que não podem
 * ser executadas concorrentemente (ex: publicação Instagram).
 *
 * Implementação simplificada com SET NX + TTL.
 * Para sistemas multi-instância de alta concorrência, considerar Redlock.
 */
import { redis } from '@/lib/redis'
import { randomBytes } from 'crypto'

/**
 * Executa fn() sob lock exclusivo por chave.
 * Lança erro se o lock não for adquirido (outra instância está processando).
 *
 * @param key  Identificador único do recurso (ex: `publish:post:${postId}`)
 * @param ttl  TTL do lock em segundos — deve ser > tempo máximo de execução de fn()
 * @param fn   Operação a executar exclusivamente
 */
export async function withLock<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  const lockKey = `lock:${key}`
  const lockValue = randomBytes(16).toString('hex')

  const acquired = await redis.set(lockKey, lockValue, { nx: true, ex: ttl })
  if (!acquired) {
    throw new Error(`Lock not acquired: ${key} — concurrent operation in progress`)
  }

  try {
    return await fn()
  } finally {
    // Liberar apenas se ainda for o dono do lock (comparação atômica via Lua)
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `
    await redis.eval(script, [lockKey], [lockValue]).catch(() => {
      // Silencioso — lock expirará pelo TTL se DEL falhar
    })
  }
}
