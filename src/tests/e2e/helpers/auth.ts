/**
 * Helper E2E: autenticação
 */
import type { Page, BrowserContext } from '@playwright/test'
import { expect } from '@playwright/test'

export const TEST_CREDENTIALS = {
  email: process.env.E2E_TEST_EMAIL ?? 'e2e@inbound-forge.test',
  password: process.env.E2E_TEST_PASSWORD ?? 'E2eTest1234!',
}

// Nome de cookie do app (espelha src/lib/supabase-cookie.ts). Mantê-los em sincronia.
const SUPABASE_AUTH_COOKIE_NAME = 'sb-inbound-forge-auth-token'

/**
 * Login PROGRAMÁTICO: obtém um token via Supabase Auth e injeta o cookie de
 * sessão no contexto, sem passar pela UI. Determinístico e rápido — evita a
 * corrida de hidratação do form de login. Ideal para testes que só precisam
 * de uma sessão válida (health de páginas, fluxos de API).
 */
export async function loginViaApi(
  context: BrowserContext,
  baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    throw new Error(
      'loginViaApi requer NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no ambiente',
    )
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_CREDENTIALS.email, password: TEST_CREDENTIALS.password }),
  })
  const session = await res.json()
  if (!session?.access_token) {
    throw new Error(`loginViaApi: grant falhou (${res.status}): ${JSON.stringify(session).slice(0, 200)}`)
  }

  // Formato @supabase/ssr: cookie = "base64-" + base64(JSON da sessão).
  const value = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64')
  const { hostname } = new URL(baseURL)
  await context.addCookies([
    {
      name: SUPABASE_AUTH_COOKIE_NAME,
      value,
      domain: hostname,
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ])
}

/**
 * Faz login como operador e aguarda redirect para /dashboard.
 *
 * Observações:
 * - O app é locale-prefixed, então usamos `/pt-BR/login`.
 * - `networkidle` não é usado porque o app faz polling/SSE e nunca fica ocioso;
 *   esperamos o input renderizar (hidratação) em vez disso.
 * - Os testids seguem o padrão `form-login-*` do componente real.
 */
export async function loginAsOperator(page: Page): Promise<void> {
  // Tenta até 3 vezes: sob carga, o submit pode disparar antes da hidratação do
  // React (resultando em GET nativo do form com as credenciais na query string).
  // Detectamos esse caso e repetimos.
  let lastErr: unknown
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto('/pt-BR/login', { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-testid="form-login-email-input"]')
      // Espera a hidratação: o handler de submit (preventDefault) precisa estar
      // ligado, senão o form faz GET nativo. Em dev o JS compila sob demanda, então
      // damos uma folga progressiva por tentativa.
      await page.waitForLoadState('load')
      await page.waitForTimeout(1500 * attempt)

      await page.fill('[data-testid="form-login-email-input"]', TEST_CREDENTIALS.email)
      await page.fill('[data-testid="form-login-password-input"]', TEST_CREDENTIALS.password)
      await page.click('[data-testid="form-login-submit-button"]')

      await page.waitForURL('**/dashboard', { timeout: 20000 })
      await expect(page).toHaveURL(/\/dashboard/)
      return
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr
}
