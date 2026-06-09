/**
 * SSRF-safe fetch (SA-SEC-02) — util do APP (Node/Next).
 *
 * Defende o pipeline de scraping contra Server-Side Request Forgery:
 *  - resolve o hostname via DNS e valida TODOS os enderecos contra ranges
 *    privados/link-local/metadata (evita o regex puramente textual anterior, que
 *    nao via DNS rebinding nem hostnames que resolvem para IP interno);
 *  - pina o IP validado no dispatcher undici via connect.lookup, preservando
 *    Host/SNI original (fecha a janela TOCTOU entre validar e conectar);
 *  - segue redirects manualmente (redirect:'manual'), revalidando cada hop, para
 *    que um 3xx nao escape o guard apontando para 169.254.169.254 e afins.
 *
 * O worker de scraping (package separado, sem alias @/) tem um espelho leve em
 * workers/scraping-worker/src/ssrf-guard.ts — manter a logica de isBlockedIp
 * identica entre os dois (mesma convencao do source-protection.ts duplicado).
 */
import { Agent } from 'undici'
import { lookup } from 'node:dns/promises'
import { isBlockedDomain } from '@/lib/constants/blocked-domains'

export class SsrfBlockedError extends Error {
  readonly code = 'SSRF_BLOCKED'
  constructor(reason: string) {
    super(`URL bloqueada por SSRF guard: ${reason}`)
    this.name = 'SsrfBlockedError'
  }
}

/**
 * Avalia um IPv4 literal. Retorna:
 *  - true  -> dentro de um range proibido (ou malformado);
 *  - false -> IPv4 publico permitido;
 *  - null  -> nao e um IPv4 literal (deixa o caller tentar IPv6).
 */
function ipv4Blocked(host: string): boolean | null {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return null
  const o = m.slice(1, 5).map(Number)
  if (o.some((n) => n > 255)) return true // octeto invalido -> trata como interno
  const [a, b, c] = o
  if (a === 0) return true // 0.0.0.0/8
  if (a === 10) return true // 10/8
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64/10 CGNAT
  if (a === 127) return true // loopback 127/8
  if (a === 169 && b === 254) return true // 169.254/16 link-local (metadata cloud)
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16/12
  if (a === 192 && b === 168) return true // 192.168/16
  if (a === 192 && b === 0 && c === 0) return true // 192.0.0/24
  if (a === 198 && (b === 18 || b === 19)) return true // 198.18/15 benchmark
  if (a >= 224) return true // 224/4 multicast + 240/4 reservado + 255.255.255.255
  return false
}

/**
 * Avalia um IPv6 literal (cobre os casos relevantes para SSRF). Retorna
 * true/false/null no mesmo contrato de ipv4Blocked.
 */
function ipv6Blocked(host: string): boolean | null {
  let h = host.toLowerCase()
  const zone = h.indexOf('%')
  if (zone >= 0) h = h.slice(0, zone) // remove zona (%eth0)
  if (!h.includes(':')) return null // nao e IPv6
  if (h === '::' || h === '::1') return true // unspecified / loopback
  // IPv4-mapped/compat: ::ffff:a.b.c.d ou ::a.b.c.d -> revalida como IPv4
  const mapped = h.match(/(?:::ffff:|::)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  if (mapped) {
    const v4 = ipv4Blocked(mapped[1])
    return v4 === null ? true : v4
  }
  const first2 = h.slice(0, 2)
  if (first2 === 'fc' || first2 === 'fd') return true // fc00::/7 ULA
  const first3 = h.slice(0, 3)
  if (first3 === 'fe8' || first3 === 'fe9' || first3 === 'fea' || first3 === 'feb') return true // fe80::/10 link-local
  return false
}

/** True se o IP literal cai em um range privado/link-local/metadata/reservado. */
export function isBlockedIp(ip: string): boolean {
  const stripped = ip.replace(/^\[|\]$/g, '')
  const v4 = ipv4Blocked(stripped)
  if (v4 !== null) return v4
  const v6 = ipv6Blocked(stripped)
  if (v6 !== null) return v6
  return false // nao reconhecido como IP literal
}

/**
 * Guard SINCRONO para create/update de Source (defense-in-depth): rejeita
 * localhost e IPs literais internos sem resolver DNS. A validacao autoritativa
 * (com DNS-resolve) acontece em safeFetch / assertUrlSafe no momento do acesso,
 * pois um hostname publico pode sofrer rebinding depois.
 */
export function isBlockedLiteralHost(hostname: string): boolean {
  if (!hostname) return true
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  if (ipv4Blocked(h) === true) return true
  if (ipv6Blocked(h) === true) return true
  return false
}

export interface AllowedHost {
  url: URL
  ip: string
  family: 4 | 6
}

/**
 * Valida que rawUrl e http(s), nao esta em dominio bloqueado, e resolve para um
 * IP publico. Retorna a URL parseada + o IP pinado (primeiro endereco permitido).
 * Lanca SsrfBlockedError em qualquer violacao.
 */
export async function assertHostAllowed(rawUrl: string): Promise<AllowedHost> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new SsrfBlockedError('URL malformada')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SsrfBlockedError(`protocolo nao permitido (${url.protocol})`)
  }
  if (isBlockedDomain(rawUrl)) {
    throw new SsrfBlockedError('dominio bloqueado')
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  const v4 = ipv4Blocked(hostname)
  const v6 = ipv6Blocked(hostname)
  if (v4 === true || v6 === true) {
    throw new SsrfBlockedError(`IP interno (${hostname})`)
  }
  if (v4 === false) return { url, ip: hostname, family: 4 }
  if (v6 === false) return { url, ip: hostname, family: 6 }

  // Hostname textual: resolver DNS e validar TODOS os enderecos.
  let addrs: Array<{ address: string; family: number }>
  try {
    addrs = await lookup(hostname, { all: true })
  } catch {
    throw new SsrfBlockedError(`falha ao resolver host (${hostname})`)
  }
  if (!addrs.length) throw new SsrfBlockedError(`host sem enderecos (${hostname})`)
  for (const a of addrs) {
    if (isBlockedIp(a.address)) {
      throw new SsrfBlockedError(`host resolve para IP interno (${a.address})`)
    }
  }
  const first = addrs[0]
  return { url, ip: first.address, family: first.family === 6 ? 6 : 4 }
}

/**
 * fetch SSRF-safe: valida + pina o IP a cada hop e segue redirects manualmente
 * (cada Location e revalidado). Use SEMPRE que a URL for controlada pelo usuario.
 */
export async function safeFetch(
  input: string,
  init: RequestInit & { maxRedirects?: number } = {},
): Promise<Response> {
  const { maxRedirects = 3, ...rest } = init
  let current = input
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const { url, ip, family } = await assertHostAllowed(current)
    // Pina o IP validado preservando Host/SNI original (anti-rebinding TOCTOU).
    const dispatcher = new Agent({
      connect: {
        lookup: ((_hostname: string, options: unknown, callback: unknown): void => {
          const all = !!(options as { all?: boolean })?.all
          if (all) {
            ;(callback as (e: null, a: Array<{ address: string; family: number }>) => void)(
              null,
              [{ address: ip, family }],
            )
          } else {
            ;(callback as (e: null, a: string, f: number) => void)(null, ip, family)
          }
        }) as never,
      },
    })
    const options = { ...rest, redirect: 'manual' as const, dispatcher }
    const res = await fetch(url, options as RequestInit)
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) return res
      current = new URL(loc, url).toString()
      continue
    }
    return res
  }
  throw new SsrfBlockedError('muitos redirects')
}
