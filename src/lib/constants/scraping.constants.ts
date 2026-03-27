/**
 * Constantes de configuração do módulo de scraping — module-6
 * Rastreabilidade: TASK-0 ST002, COMP-006, SEC-001
 */

/** Tempo máximo que rawText pode permanecer no banco (COMP-006) */
export const MAX_RAW_TEXT_TTL_HOURS = 1

/** Número máximo de fontes por batch */
export const MAX_BATCH_SIZE = 50

/** Intervalo de heartbeat do worker (ms) — CX-05 */
export const HEARTBEAT_INTERVAL_MS = 30_000

/** Máximo de páginas sendo processadas simultaneamente */
export const MAX_CONCURRENT_PAGES = 3

/** Timeout de navegação do Playwright (ms) */
export const PAGE_TIMEOUT_MS = 30_000

/** Número de retries em caso de timeout de página */
export const CRAWLER_MAX_RETRIES = 2

/** Schedule padrão do cron de scraping (2AM diário) */
export const DEFAULT_CRON_SCHEDULE = '0 2 * * *'

/** Máximo de chars do preview de extração de teste */
export const EXTRACTION_PREVIEW_MAX_CHARS = 500

/** Timeout do endpoint de teste de extração (ms) */
export const TEST_EXTRACTION_TIMEOUT_MS = 30_000

/** Delay mínimo entre chamadas Claude API (ms) */
export const CLAUDE_API_MIN_DELAY_MS = 200

/** Concorrência máxima para chamadas Claude API */
export const CLAUDE_API_MAX_CONCURRENCY = 5
