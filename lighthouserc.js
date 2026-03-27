/**
 * lighthouserc.js — Configuração Lighthouse CI
 * Rastreabilidade: PERF-005, TASK-5/ST003
 * Score >= 90 performance + accessibility em 4 rotas
 */

/** @type {import('@lhci/cli').LhciConfig} */
module.exports = {
  ci: {
    collect: {
      // 4 rotas principais (PERF-005)
      url: [
        'http://localhost:3000',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/analytics',
        'http://localhost:3000/health',
      ],
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
      settings: {
        // Mobile-first (mobile_first.enabled = true)
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
        },
        throttling: {
          // Throttling de rede para 4G lento (simular mobile real)
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
      },
    },

    assert: {
      // Thresholds por categoria (PERF-005)
      assertions: {
        // Performance >= 90 (erro — bloqueia merge)
        'categories:performance': ['error', { minScore: 0.9 }],
        // Accessibility >= 90 (erro — bloqueia merge)
        'categories:accessibility': ['error', { minScore: 0.9 }],
        // Best Practices >= 85 (aviso)
        'categories:best-practices': ['warn', { minScore: 0.85 }],
        // SEO >= 85 (aviso)
        'categories:seo': ['warn', { minScore: 0.85 }],
      },
    },

    upload: {
      // Salvar relatórios como artefato do CI
      target: 'filesystem',
      outputDir: '.lighthouse-reports',
    },
  },
}
