import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import {
  begin,
  complete,
  release,
  IdempotencyStoreUnavailableError,
  type CachedResponse,
} from './store'
import { ERROR_CODES, type ErrorCode } from '@/lib/errors/codes'

// UUID v7: versao '7' no 13o digito hex, variante [89ab] no 17o.
const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const IDEMPOTENCY_HEADER = 'idempotency-key'
const REPLAY_HEADER = 'Idempotent-Replayed'

function idempotencyError(code: ErrorCode, status: number): NextResponse {
  return NextResponse.json(
    { success: false, error_code: code, error: ERROR_CODES[code] },
    { status, headers: { 'Cache-Control': 'no-store' } },
  )
}

async function fingerprintRequest(
  request: Request,
  method: string,
  pathname: string,
): Promise<string> {
  // Clona o request para ler o corpo SEM consumir o stream do handler.
  let body = ''
  try {
    body = await request.clone().text()
  } catch {
    body = ''
  }
  return createHash('sha256').update(`${method}\n${pathname}\n${body}`).digest('hex')
}

async function serializeResponse(response: NextResponse): Promise<CachedResponse> {
  // Clona para nao consumir o corpo que sera devolvido ao cliente.
  const body = await response.clone().text()
  return {
    status: response.status,
    body,
    contentType: response.headers.get('content-type') ?? 'application/json',
  }
}

function replayResponse(cached: CachedResponse): NextResponse {
  return new NextResponse(cached.body, {
    status: cached.status,
    headers: {
      'Content-Type': cached.contentType,
      [REPLAY_HEADER]: 'true',
    },
  })
}

export interface WithIdempotencyOptions {
  /** Identificador de escopo: user.id em rotas autenticadas, 'public' em rotas publicas. */
  userId: string
  handler: () => Promise<NextResponse>
}

/**
 * Middleware generico de idempotencia para mutations criticas (TAREFA-019).
 *
 * Contrato:
 *  - Header `Idempotency-Key` (UUID v7) obrigatorio -> 400 tipado se ausente/invalido.
 *  - Escopo = userId + metodo + pathname + key (evita replay cruzado entre recursos).
 *  - Mesma key + mesmo corpo (24h) -> resposta cacheada + header Idempotent-Replayed: true.
 *  - Mesma key + corpo divergente -> 409 tipado, mutation NAO re-executada.
 *  - Requisicao concorrente com mesma key/corpo em execucao -> 409 tipado.
 *  - Redis indisponivel -> 503 tipado (nunca bypass silencioso).
 *
 * Apenas respostas 2xx sao cacheadas; respostas de erro liberam a chave para
 * permitir retry legitimo da mutation.
 */
export async function withIdempotency(
  request: Request,
  { userId, handler }: WithIdempotencyOptions,
): Promise<NextResponse> {
  const key = request.headers.get(IDEMPOTENCY_HEADER)
  if (!key) {
    return idempotencyError('ERR-060', 400)
  }
  if (!UUID_V7_REGEX.test(key)) {
    return idempotencyError('ERR-061', 400)
  }

  const method = request.method
  const pathname = new URL(request.url).pathname
  const fingerprint = await fingerprintRequest(request, method, pathname)
  const scopeKey = `idem:v1:${userId}:${method}:${pathname}:${key}`

  let begun
  try {
    begun = await begin(scopeKey, fingerprint)
  } catch (err) {
    if (err instanceof IdempotencyStoreUnavailableError) {
      return idempotencyError('ERR-064', 503)
    }
    throw err
  }

  if (begun.state === 'replay') {
    return replayResponse(begun.response)
  }
  if (begun.state === 'mismatch') {
    return idempotencyError('ERR-062', 409)
  }
  if (begun.state === 'in_flight') {
    return idempotencyError('ERR-063', 409)
  }

  // state === 'started': executa o handler e cacheia a resposta.
  let response: NextResponse
  try {
    response = await handler()
  } catch (err) {
    await release(scopeKey)
    throw err
  }

  try {
    if (response.status >= 200 && response.status < 300) {
      const cached = await serializeResponse(response)
      await complete(scopeKey, fingerprint, cached)
      response.headers.set(REPLAY_HEADER, 'false')
    } else {
      await release(scopeKey)
    }
  } catch (err) {
    if (err instanceof IdempotencyStoreUnavailableError) {
      // A mutation JA executou; nao da para garantir o cache. Liberar a chave
      // (best-effort) e devolver a resposta real ja produzida.
      await release(scopeKey)
      return response
    }
    throw err
  }

  return response
}
