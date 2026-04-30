/**
 * onboarding.ts — MSW handlers para /api/v1/onboarding/* (TASK-12 ST003)
 *
 * Cobre:
 *  - GET    /api/v1/onboarding/progress  → progresso atual
 *  - PATCH  /api/v1/onboarding/progress  → atualizar passo
 *  - POST   /api/v1/onboarding/activation → ativar operador
 *  - POST   /api/v1/onboarding/seed-defaults → semear dados
 */
import { http, HttpResponse } from 'msw'

export const defaultOnboardingProgress = {
  currentStep: 1,
  totalSteps: 7,
  completedSteps: [] as number[],
  data: {} as Record<string, unknown>,
}

export const onboardingHandlers = [
  http.get('*/api/v1/onboarding/progress', () =>
    HttpResponse.json({ success: true, data: defaultOnboardingProgress }),
  ),

  http.patch('*/api/v1/onboarding/progress', async ({ request }) => {
    const body = (await request.json()) as Partial<typeof defaultOnboardingProgress>
    return HttpResponse.json({
      success: true,
      data: { ...defaultOnboardingProgress, ...body },
    })
  }),

  http.post('*/api/v1/onboarding/activation', () =>
    HttpResponse.json({ success: true, data: { activated: true } }),
  ),

  http.post('*/api/v1/onboarding/seed-defaults', () =>
    HttpResponse.json({ success: true, data: { seeded: true } }),
  ),
]
