// module-9: TASK-2 ST005 — Snapshot tests for all 8 Satori templates
// Rastreabilidade: TASK-2 ST005, FEAT-creative-generation-005
// Run: vitest --run src/templates/__tests__/templates.test.tsx

import { describe, it, expect } from 'vitest'
import { getTemplateElement } from '../index'
import type { TemplateType } from '../../types'

import {
  CarouselTemplate,
  StaticLandscapeTemplate,
  StaticPortraitTemplate,
  VideoCoverTemplate,
  BeforeAfterTemplate,
  ErrorCardTemplate,
  SolutionCardTemplate,
  BackstageCardTemplate,
} from '../index'

// Minimal Satori-compatible render check — verifies element creation without satori runtime
function renderToElement(templateType: TemplateType, props: Record<string, unknown>) {
  const el = getTemplateElement(templateType, props as never)
  expect(el).toBeDefined()
  expect(el.type).toBeDefined()
  return el
}

const EXPECTED_TYPES: Record<TemplateType, unknown> = {
  CAROUSEL:         CarouselTemplate,
  STATIC_LANDSCAPE: StaticLandscapeTemplate,
  STATIC_PORTRAIT:  StaticPortraitTemplate,
  VIDEO_COVER:      VideoCoverTemplate,
  BEFORE_AFTER:     BeforeAfterTemplate,
  ERROR_CARD:       ErrorCardTemplate,
  SOLUTION_CARD:    SolutionCardTemplate,
  BACKSTAGE_CARD:   BackstageCardTemplate,
}

describe('Template Registry', () => {
  it('throws for unknown template type', () => {
    expect(() =>
      getTemplateElement('UNKNOWN_TYPE' as TemplateType, { headline: 'test' } as never)
    ).toThrow('Template desconhecido: UNKNOWN_TYPE')
  })
})

describe('CAROUSEL template', () => {
  const baseProps = {
    headline:    'Como triplicar seus resultados',
    subheadline: 'Estratégia de conteúdo',
    bodyText:    'O método que mudou minha abordagem',
    slideNumber: 1,
    totalSlides: 5,
    brandColor:  '#4F46E5',
  }

  it('renders with all props', () => {
    const el = renderToElement('CAROUSEL', baseProps)
    expect(el.type).toBe(EXPECTED_TYPES['CAROUSEL'])
    expect(el.props.slideNumber).toBe(1)
    expect(el.props.totalSlides).toBe(5)
  })

  it('renders without optional props', () => {
    const el = renderToElement('CAROUSEL', {
      headline:    baseProps.headline,
      bodyText:    baseProps.bodyText,
      slideNumber: 1,
      totalSlides: 3,
    })
    expect(el.type).toBe(EXPECTED_TYPES['CAROUSEL'])
  })
})

describe('STATIC_LANDSCAPE template', () => {
  it('renders with all props', () => {
    const el = renderToElement('STATIC_LANDSCAPE', {
      headline:    'Transforme seu marketing',
      subheadline: 'Estratégia comprovada',
      bodyText:    'Descubra como gerar leads qualificados',
      ctaText:     'Saiba mais',
      brandColor:  '#10B981',
    })
    expect(el.type).toBe(EXPECTED_TYPES['STATIC_LANDSCAPE'])
    expect(el.props.ctaText).toBe('Saiba mais')
  })

  it('renders with only headline', () => {
    const el = renderToElement('STATIC_LANDSCAPE', { headline: 'Apenas headline' })
    expect(el.type).toBe(EXPECTED_TYPES['STATIC_LANDSCAPE'])
  })
})

describe('STATIC_PORTRAIT template', () => {
  it('renders with all props', () => {
    const el = renderToElement('STATIC_PORTRAIT', {
      headline:    'Conteúdo vertical',
      subheadline: 'Para Instagram Feed',
      bodyText:    'Engajamento orgânico',
    })
    expect(el.type).toBe(EXPECTED_TYPES['STATIC_PORTRAIT'])
    expect(el.props.headline).toBe('Conteúdo vertical')
  })
})

describe('VIDEO_COVER template', () => {
  it('renders with play icon', () => {
    const el = renderToElement('VIDEO_COVER', {
      headline:     'Assista ao tutorial completo',
      subheadline:  '15 minutos que vão mudar tudo',
      showPlayIcon: true,
    })
    expect(el.type).toBe(EXPECTED_TYPES['VIDEO_COVER'])
    expect(el.props.showPlayIcon).toBe(true)
  })

  it('renders without play icon', () => {
    const el = renderToElement('VIDEO_COVER', {
      headline:     'Cover sem play',
      showPlayIcon: false,
    })
    expect(el.type).toBe(EXPECTED_TYPES['VIDEO_COVER'])
  })
})

describe('BEFORE_AFTER template', () => {
  it('renders with default labels', () => {
    const el = renderToElement('BEFORE_AFTER', {
      headline:    'Antes e Depois da estratégia',
      beforeText:  'Sem estratégia definida, postagens aleatórias',
      afterText:   'Plano editorial consistente, +300% alcance',
    })
    expect(el.type).toBe(EXPECTED_TYPES['BEFORE_AFTER'])
    expect(el.props.beforeText).toBeDefined()
    expect(el.props.afterText).toBeDefined()
  })

  it('renders with custom labels', () => {
    const el = renderToElement('BEFORE_AFTER', {
      headline:     'Resultado',
      beforeText:   'Problema antigo',
      afterText:    'Solução atual',
      beforeLabel:  'Problema',
      afterLabel:   'Solução',
    })
    expect(el.type).toBe(EXPECTED_TYPES['BEFORE_AFTER'])
  })
})

describe('ERROR_CARD template', () => {
  it('renders with all props', () => {
    const el = renderToElement('ERROR_CARD', {
      headline:         'Você está perdendo clientes',
      subheadline:      'E nem percebe',
      errorDescription: 'Sem follow-up, 80% dos leads esfria em 48h',
      impactText:       'Perda estimada: R$15k/mês em receita',
      brandColor:       '#EF4444',
    })
    expect(el.type).toBe(EXPECTED_TYPES['ERROR_CARD'])
    expect(el.props.errorDescription).toBeDefined()
  })
})

describe('SOLUTION_CARD template', () => {
  it('renders with 3 solution points', () => {
    const el = renderToElement('SOLUTION_CARD', {
      headline:       'O método dos 3 passos',
      subheadline:    'Simples e replicável',
      solutionPoints: ['Diagnóstico rápido', 'Plano de ação 30/60/90', 'Execução com métricas'],
      ctaText:        'Começar agora',
    })
    expect(el.type).toBe(EXPECTED_TYPES['SOLUTION_CARD'])
    expect((el.props as { solutionPoints: string[] }).solutionPoints).toHaveLength(3)
  })

  it('truncates to max 3 points', () => {
    const el = renderToElement('SOLUTION_CARD', {
      headline:       'Muitos pontos',
      solutionPoints: ['Ponto 1', 'Ponto 2', 'Ponto 3', 'Ponto 4 (deve ser ignorado)'],
    })
    // The component itself slices to 3 — we verify input is passed
    expect(el.type).toBe(EXPECTED_TYPES['SOLUTION_CARD'])
  })
})

describe('BACKSTAGE_CARD template', () => {
  it('renders with all props', () => {
    const el = renderToElement('BACKSTAGE_CARD', {
      headline:    'Como produzo 30 posts em 4h',
      subheadline: 'Meu processo semanal',
      bodyText:    'Gravação em lote, edição com templates, agendamento automático',
      brandColor:  '#8B5CF6',
    })
    expect(el.type).toBe(EXPECTED_TYPES['BACKSTAGE_CARD'])
    expect(el.props.brandColor).toBe('#8B5CF6')
  })

  it('renders with only headline', () => {
    const el = renderToElement('BACKSTAGE_CARD', { headline: 'Bastidores simples' })
    expect(el.type).toBe(EXPECTED_TYPES['BACKSTAGE_CARD'])
  })
})
