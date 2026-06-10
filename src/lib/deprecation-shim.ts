import { NextResponse } from 'next/server'

/**
 * Shim de depreciacao para rotas legadas /api/* com twin verificado em /api/v1/*.
 *
 * Contexto: TASK-016 (loop 05-27-inbound-forge-user-friendly) deprecou de forma
 * controlada, por allowlist verificada de paridade, 13 rotas legadas que possuem
 * handler identico sob /api/v1/. Cada rota legada passou a executar o handler v1
 * in-process (proxy) e anexar headers de depreciacao. Ver:
 *   - src/app/api/_legacy/MAP.md (veredito de paridade por rota + Sunset)
 *   - pending-actions/inbound-forge.md (data de remocao do alias)
 *
 * Regras Zero aplicadas:
 *   - Zero Silencio: falha do handler v1 (5xx ou excecao) nunca e engolida —
 *     vira log estruturado + resposta 502 tipada.
 *   - Zero Estados Indefinidos: sucesso e falha tem caminho explicito.
 */

/**
 * Data de Sunset do grace period das rotas legadas.
 * Default = data do merge (2026-05-31) + 30 dias = 2026-06-30, formato RFC 1123.
 */
export const LEGACY_SUNSET = 'Tue, 30 Jun 2026 23:59:59 GMT'

/**
 * Cap de timeout do proxy in-process para o handler v1 (TASK-016 failure spec).
 * Se o handler v1 nao resolver dentro deste limite, o shim cai em 502 tipado
 * (Zero Silencio + Zero Estados Indefinidos), em vez de pendurar a requisicao.
 */
export const LEGACY_SHIM_TIMEOUT_MS = 10_000

/**
 * Anexa os headers canonicos de depreciacao a uma resposta legada e a retorna.
 *
 * - `Deprecation: true`
 * - `Sunset: <RFC 1123>`
 * - `Link: <path-v1>; rel="successor-version"`
 */
export function withDeprecationHeaders<T extends Response>(
  res: T,
  successorPath: string
): T {
  res.headers.set('Deprecation', 'true')
  res.headers.set('Sunset', LEGACY_SUNSET)
  res.headers.set('Link', `<${successorPath}>; rel="successor-version"`)
  return res
}

/**
 * Deriva o path v1 successor concreto a partir do pathname legado, inserindo
 * `/v1` logo apos `/api`. Ex: `/api/knowledge/cases/123` -> `/api/v1/knowledge/cases/123`.
 * Usado para que o header `Link` aponte para o recurso v1 real (com o id), nao
 * para um template `[id]`.
 */
export function legacySuccessorPath(legacyPathname: string): string {
  return legacyPathname.replace(/^\/api\//, '/api/v1/')
}

function shimFailure(target: string, successorPath: string): NextResponse {
  const res = NextResponse.json(
    { error: 'legacy-shim-failed', target },
    { status: 502 }
  )
  return withDeprecationHeaders(res, successorPath)
}

/**
 * Executa o handler v1 in-process, anexa headers de depreciacao no sucesso e
 * trata falha de forma explicita (Zero Silencio).
 *
 * @param handler   Closure que invoca o handler v1 capturando (request, context).
 *                  E chamado sem argumentos: `() => v1GET(request, context)`.
 * @param successorPath Path v1 usado no header `Link` (ex: `/api/v1/posts`).
 * @param meta      `{ route, target }` para log estruturado e body do 502.
 */
export async function proxyToV1(
  handler: () => Promise<Response> | Response,
  successorPath: string,
  meta: { route: string; target: string }
): Promise<Response> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('legacy-shim-timeout')),
        LEGACY_SHIM_TIMEOUT_MS
      )
    })
    // (async () => handler())() captura throws sincronos do handler na race.
    const res = await Promise.race([(async () => handler())(), timeout])
    if (res.status >= 500) {
      console.error(
        '[legacy-shim]',
        JSON.stringify({ route: meta.route, target_v1: meta.target, status: res.status })
      )
      return shimFailure(meta.target, successorPath)
    }
    return withDeprecationHeaders(res, successorPath)
  } catch (err) {
    const isTimeout = err instanceof Error && err.message === 'legacy-shim-timeout'
    console.error(
      '[legacy-shim]',
      JSON.stringify({
        route: meta.route,
        target_v1: meta.target,
        status: isTimeout ? 'timeout' : 'exception',
        message: err instanceof Error ? err.message : String(err),
      })
    )
    return shimFailure(meta.target, successorPath)
  } finally {
    if (timer) clearTimeout(timer)
  }
}
