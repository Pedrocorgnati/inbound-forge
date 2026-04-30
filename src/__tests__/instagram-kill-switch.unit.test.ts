// TASK-12 ST005 (G-002) — kill-switch INSTAGRAM_PUBLISHING_LIVE.
//
// Cobertura:
//   - Tipo PublishAuditData aceita action 'publish_blocked_kill_switch'.
//   - KillSwitchEnabledError carrega code='KILL_SWITCH_ON' e e instancia de Error.
//   - FEATURE_FLAGS_FORCE_OFF env var bloqueia a flag em isFeatureEnabled (override
//     PostHog) — comportamento canonico para kill-switch local de emergencia.
//
// Nota: integration test de ponta-a-ponta da rota POST /api/instagram/publish
// com toggle real do PostHog requer servidor + DB + Redis (vitest exclude
// `src/tests/api-contracts/**` e `src/tests/contracts/**`). Sera coberto na
// fase qa-gate via runtime test contra staging.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { KillSwitchEnabledError } from '@/lib/publishing/adapters/instagram.adapter'
import type { PublishAuditData } from '@/lib/audit/publish-audit'

describe('TASK-12 / G-002 — kill-switch INSTAGRAM_PUBLISHING_LIVE', () => {
  describe('PublishAuditData.action', () => {
    it('aceita publish_blocked_kill_switch', () => {
      const data: PublishAuditData = {
        postId: 'post_xyz',
        action: 'publish_blocked_kill_switch',
        result: 'failure',
        errorMessage: 'kill_switch_on',
      }
      expect(data.action).toBe('publish_blocked_kill_switch')
      expect(data.result).toBe('failure')
    })
  })

  describe('KillSwitchEnabledError', () => {
    it('e instancia de Error com code=KILL_SWITCH_ON', () => {
      const err = new KillSwitchEnabledError()
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe('KillSwitchEnabledError')
      expect(err.code).toBe('KILL_SWITCH_ON')
    })

    it('aceita mensagem custom', () => {
      const err = new KillSwitchEnabledError('mensagem custom')
      expect(err.message).toBe('mensagem custom')
    })

    it('default message identifica a flag', () => {
      const err = new KillSwitchEnabledError()
      expect(err.message).toContain('INSTAGRAM_PUBLISHING_LIVE')
    })
  })

  describe('FEATURE_FLAGS_FORCE_OFF override (kill-switch local)', () => {
    const ORIGINAL_ENV = process.env.FEATURE_FLAGS_FORCE_OFF

    beforeEach(() => {
      vi.resetModules()
    })

    afterEach(() => {
      if (ORIGINAL_ENV === undefined) {
        delete process.env.FEATURE_FLAGS_FORCE_OFF
      } else {
        process.env.FEATURE_FLAGS_FORCE_OFF = ORIGINAL_ENV
      }
    })

    it('FEATURE_FLAGS_FORCE_OFF=instagram-publishing-live forca false', async () => {
      process.env.FEATURE_FLAGS_FORCE_OFF = 'instagram-publishing-live'
      // Mock posthog-node para nao tentar conexao real
      vi.doMock('posthog-node', () => ({
        PostHog: class {
          isFeatureEnabled() { return Promise.resolve(true) } // PostHog diz "true"
          shutdown() { return Promise.resolve() }
        },
      }))
      const { isFeatureEnabled, FeatureFlags } = await import('@/lib/feature-flags')
      const result = await isFeatureEnabled(FeatureFlags.INSTAGRAM_PUBLISHING_LIVE)
      // Override env vence o PostHog
      expect(result).toBe(false)
    })

    it('CSV multiplas flags: scraping + instagram', async () => {
      process.env.FEATURE_FLAGS_FORCE_OFF = 'scraping-worker-live,instagram-publishing-live'
      vi.doMock('posthog-node', () => ({
        PostHog: class {
          isFeatureEnabled() { return Promise.resolve(true) }
          shutdown() { return Promise.resolve() }
        },
      }))
      const { isFeatureEnabled, FeatureFlags } = await import('@/lib/feature-flags')
      expect(await isFeatureEnabled(FeatureFlags.INSTAGRAM_PUBLISHING_LIVE)).toBe(false)
      expect(await isFeatureEnabled(FeatureFlags.SCRAPING_WORKER_LIVE)).toBe(false)
    })

    it('flag nao listada NAO e forcada (continua decidindo via PostHog)', async () => {
      process.env.FEATURE_FLAGS_FORCE_OFF = 'instagram-publishing-live'
      vi.doMock('posthog-node', () => ({
        PostHog: class {
          isFeatureEnabled() { return Promise.resolve(true) }
          shutdown() { return Promise.resolve() }
        },
      }))
      const { isFeatureEnabled, FeatureFlags } = await import('@/lib/feature-flags')
      // Outra flag — PostHog ainda decide (mock retorna true)
      expect(await isFeatureEnabled(FeatureFlags.AUTH_MIDDLEWARE_V2)).toBe(true)
    })

    it('FEATURE_FLAGS_FORCE_OFF vazio nao afeta resolucao normal', async () => {
      process.env.FEATURE_FLAGS_FORCE_OFF = ''
      vi.doMock('posthog-node', () => ({
        PostHog: class {
          isFeatureEnabled() { return Promise.resolve(true) }
          shutdown() { return Promise.resolve() }
        },
      }))
      const { isFeatureEnabled, FeatureFlags } = await import('@/lib/feature-flags')
      expect(await isFeatureEnabled(FeatureFlags.INSTAGRAM_PUBLISHING_LIVE)).toBe(true)
    })
  })
})
