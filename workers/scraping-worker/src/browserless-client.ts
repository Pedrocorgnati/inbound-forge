/**
 * Browserless Client — TASK-11 ST001 (CL-047, CL-173, CL-192)
 *
 * Unifica a obtenção de instância Browser do Playwright:
 *  - Em produção: conecta via WebSocket ao endpoint remoto Browserless
 *    (`BROWSERLESS_WS_URL`, ex.: `wss://chrome.browserless.io/playwright?token=...`).
 *  - Em dev / CI sem Browserless: lança chromium local (fallback).
 *
 * O chamador é responsável por fechar o browser (`browser.close()`).
 * Quando conectado remotamente, `close()` encerra apenas a sessão WS
 * — a instância remota permanece viva no serviço Browserless.
 */
import { chromium, type Browser } from 'playwright'

export interface GetBrowserOptions {
  /** Override explícito do WS endpoint (primário: env `BROWSERLESS_WS_URL`) */
  wsEndpoint?: string
  /** Override do executablePath para fallback local (primário: env `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`) */
  executablePath?: string
  /** Args extras ao lançar chromium local. Ignorados quando conecta remoto. */
  launchArgs?: string[]
}

const DEFAULT_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
]

/**
 * Retorna uma instância Browser. Plug-and-play:
 * - Se `BROWSERLESS_WS_URL` estiver setada → `chromium.connect()`
 * - Caso contrário → `chromium.launch()` (fallback local)
 */
export async function getBrowser(options: GetBrowserOptions = {}): Promise<Browser> {
  const wsEndpoint = options.wsEndpoint ?? process.env.BROWSERLESS_WS_URL

  if (wsEndpoint) {
    return chromium.connect({ wsEndpoint })
  }

  const executablePath =
    options.executablePath ??
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
    '/usr/bin/chromium-browser'

  return chromium.launch({
    executablePath,
    headless: true,
    args: options.launchArgs ?? DEFAULT_LAUNCH_ARGS,
  })
}

/** Modo ativo — útil para logs/diagnóstico. */
export function getBrowserMode(): 'remote' | 'local' {
  return process.env.BROWSERLESS_WS_URL ? 'remote' : 'local'
}
