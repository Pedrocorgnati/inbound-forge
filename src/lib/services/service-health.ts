/**
 * Service Health Checker — Inbound Forge
 * TASK-2 ST001 / intake-review Graceful Degradation
 *
 * Verifica disponibilidade de serviços externos com cache Redis (TTL 60s).
 * CL-132: base para graceful degradation em toda a aplicação.
 * SEC: nunca logar API keys ou detalhes de resposta nos health checks.
 */
import { redis } from '@/lib/redis'

export enum ExternalService {
  CLAUDE = 'claude',
  IDEOGRAM = 'ideogram',
  FLUX = 'flux',
  BROWSERLESS = 'browserless',
  INSTAGRAM_GRAPH = 'instagram_graph',
}

export interface ServiceHealthResult {
  available: boolean
  latencyMs: number
}

const HEALTH_CACHE_TTL = 60 // segundos
const HEALTH_CHECK_TIMEOUT_MS = 5_000

function cacheKey(service: ExternalService): string {
  return `health:service:${service}`
}

/**
 * Endpoints de health check leve por serviço.
 * Usa HEAD ou ping endpoint público quando disponível.
 */
function getHealthEndpoint(service: ExternalService): string | null {
  switch (service) {
    case ExternalService.CLAUDE:
      // Anthropic não expõe health endpoint público — verifica via env key presence
      return null
    case ExternalService.IDEOGRAM:
      return 'https://api.ideogram.ai'
    case ExternalService.FLUX:
      return 'https://fal.run'
    case ExternalService.BROWSERLESS:
      return process.env['BROWSERLESS_URL'] ?? 'https://chrome.browserless.io'
    case ExternalService.INSTAGRAM_GRAPH:
      return 'https://graph.facebook.com'
    default:
      return null
  }
}

/**
 * Verifica disponibilidade de um serviço externo.
 * Resultado cacheado no Redis por 60s para evitar health checks repetidos.
 */
export async function checkService(service: ExternalService): Promise<ServiceHealthResult> {
  const key = cacheKey(service)

  // Tentar cache Redis primeiro
  try {
    const cached = await redis.get<string>(key)
    if (cached) {
      return JSON.parse(cached) as ServiceHealthResult
    }
  } catch {
    // Cache indisponível — continuar com check direto
  }

  const start = Date.now()
  let available = false

  // Claude: verificar presença da API key (não faz request externo)
  if (service === ExternalService.CLAUDE) {
    available = !!process.env['ANTHROPIC_API_KEY']
    const result: ServiceHealthResult = { available, latencyMs: 0 }
    await cacheResult(key, result)
    return result
  }

  const endpoint = getHealthEndpoint(service)
  if (!endpoint) {
    // Sem endpoint de health check — assumir disponível
    return { available: true, latencyMs: 0 }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS)

    const response = await fetch(endpoint, {
      method: 'HEAD',
      signal: controller.signal as AbortSignal,
    })
    clearTimeout(timeout)

    // Qualquer resposta HTTP (mesmo 4xx) indica que o serviço está no ar
    available = response.status < 500
  } catch {
    available = false
  }

  const result: ServiceHealthResult = {
    available,
    latencyMs: Date.now() - start,
  }

  await cacheResult(key, result)
  return result
}

async function cacheResult(key: string, result: ServiceHealthResult): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(result), { ex: HEALTH_CACHE_TTL })
  } catch {
    // Falha de cache não impede o funcionamento
  }
}

/**
 * Helper simplificado: retorna apenas se o serviço está disponível.
 * Uso: if (!await isServiceAvailable(ExternalService.CLAUDE)) { ... fallback }
 */
export async function isServiceAvailable(service: ExternalService): Promise<boolean> {
  const result = await checkService(service)
  return result.available
}

/**
 * Verifica múltiplos serviços em paralelo.
 * Retorna mapa de serviço → disponível.
 */
export async function checkAllServices(): Promise<Record<ExternalService, boolean>> {
  const services = Object.values(ExternalService)
  const results = await Promise.all(services.map((s) => checkService(s)))

  return Object.fromEntries(
    services.map((s, i) => [s, results[i].available])
  ) as Record<ExternalService, boolean>
}

/**
 * Retorna lista de nomes amigáveis de serviços degradados.
 * Usado pelo DegradedBanner para exibir mensagem ao operador.
 */
export async function getDegradedServiceNames(): Promise<string[]> {
  const statuses = await checkAllServices()

  const labels: Record<ExternalService, string> = {
    [ExternalService.CLAUDE]: 'Claude API (geração de conteúdo)',
    [ExternalService.IDEOGRAM]: 'Ideogram (geração de imagens)',
    [ExternalService.FLUX]: 'Flux (geração de imagens)',
    [ExternalService.BROWSERLESS]: 'Scraping (coleta de dados)',
    [ExternalService.INSTAGRAM_GRAPH]: 'Instagram API (publicação)',
  }

  return Object.entries(statuses)
    .filter(([, available]) => !available)
    .map(([service]) => labels[service as ExternalService])
}
