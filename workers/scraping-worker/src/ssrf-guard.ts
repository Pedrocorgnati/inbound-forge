/**
 * SSRF guard do scraping-worker (SA-SEC-02) — espelho leve de
 * src/lib/security/safe-fetch.ts. O worker e um package separado (commonjs, sem
 * alias @/), entao a logica de isBlockedIp e DUPLICADA de proposito (mesma
 * convencao do source-protection.ts ja duplicado). Manter as duas em sincronia.
 *
 * LIMITACAO: page.goto usa a stack de rede do Chromium (Browserless remoto ou
 * chromium local), nao undici, entao NAO da para pinar o IP via dispatcher. Aqui
 * fazemos pre-flight (resolve DNS + valida todos os IPs) — ha uma janela TOCTOU
 * residual (o browser re-resolve). Mitigacao forte adicional seria
 * `--host-resolver-rules="MAP host ip"` nos launchArgs do chromium local e/ou um
 * egress allowlist no Browserless. Documentado, nao silenciado (Zero Estados).
 */
import { lookup } from 'node:dns/promises'

export class SsrfBlockedError extends Error {
  readonly code = 'SSRF_BLOCKED'
  constructor(reason: string) {
    super(`URL bloqueada por SSRF guard: ${reason}`)
    this.name = 'SsrfBlockedError'
  }
}

function ipv4Blocked(host: string): boolean | null {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return null
  const o = m.slice(1, 5).map(Number)
  if (o.some((n) => n > 255)) return true
  const [a, b, c] = o
  if (a === 0) return true // 0.0.0.0/8
  if (a === 10) return true // 10/8
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64/10 CGNAT
  if (a === 127) return true // loopback
  if (a === 169 && b === 254) return true // 169.254/16 link-local (metadata)
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16/12
  if (a === 192 && b === 168) return true // 192.168/16
  if (a === 192 && b === 0 && c === 0) return true // 192.0.0/24
  if (a === 198 && (b === 18 || b === 19)) return true // 198.18/15
  if (a >= 224) return true // multicast + reservado + broadcast
  return false
}

function ipv6Blocked(host: string): boolean | null {
  let h = host.toLowerCase()
  const zone = h.indexOf('%')
  if (zone >= 0) h = h.slice(0, zone)
  if (!h.includes(':')) return null
  if (h === '::' || h === '::1') return true
  const mapped = h.match(/(?:::ffff:|::)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  if (mapped) {
    const v4 = ipv4Blocked(mapped[1])
    return v4 === null ? true : v4
  }
  const first2 = h.slice(0, 2)
  if (first2 === 'fc' || first2 === 'fd') return true // fc00::/7 ULA
  const first3 = h.slice(0, 3)
  if (first3 === 'fe8' || first3 === 'fe9' || first3 === 'fea' || first3 === 'feb') return true // fe80::/10
  return false
}

/** True se o IP literal cai em um range privado/link-local/metadata/reservado. */
export function isBlockedIp(ip: string): boolean {
  const stripped = ip.replace(/^\[|\]$/g, '')
  const v4 = ipv4Blocked(stripped)
  if (v4 !== null) return v4
  const v6 = ipv6Blocked(stripped)
  if (v6 !== null) return v6
  return false
}

/**
 * Valida que rawUrl e http(s) e resolve para IP publico. Lanca SsrfBlockedError
 * se o protocolo for invalido, o host nao resolver, ou QUALQUER endereco
 * resolvido for interno. Retorna o IP pinado (primeiro permitido).
 */
export async function assertUrlSafe(rawUrl: string): Promise<string> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new SsrfBlockedError('URL malformada')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SsrfBlockedError(`protocolo nao permitido (${url.protocol})`)
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  const v4 = ipv4Blocked(hostname)
  const v6 = ipv6Blocked(hostname)
  if (v4 === true || v6 === true) throw new SsrfBlockedError(`IP interno (${hostname})`)
  if (v4 === false) return hostname
  if (v6 === false) return hostname

  let addrs: Array<{ address: string; family: number }>
  try {
    addrs = await lookup(hostname, { all: true })
  } catch {
    throw new SsrfBlockedError(`falha ao resolver host (${hostname})`)
  }
  if (!addrs.length) throw new SsrfBlockedError(`host sem enderecos (${hostname})`)
  for (const a of addrs) {
    if (isBlockedIp(a.address)) throw new SsrfBlockedError(`host resolve para IP interno (${a.address})`)
  }
  return addrs[0].address
}
