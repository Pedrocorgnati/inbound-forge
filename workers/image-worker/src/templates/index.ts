// module-9: Template Registry
// Rastreabilidade: TASK-2 ST003, FEAT-creative-generation-005

import React from 'react'
import type { TemplateType } from '../types'
import type { TemplateBaseProps } from './types'
import { CarouselTemplate }      from './carousel'
import { StaticLandscapeTemplate } from './static-landscape'
import { StaticPortraitTemplate } from './static-portrait'
import { VideoCoverTemplate }    from './video-cover'
import { BeforeAfterTemplate }   from './before-after'
import { ErrorCardTemplate }     from './error-card'
import { SolutionCardTemplate }  from './solution-card'
import { BackstageCardTemplate } from './backstage-card'

export {
  CarouselTemplate,
  StaticLandscapeTemplate,
  StaticPortraitTemplate,
  VideoCoverTemplate,
  BeforeAfterTemplate,
  ErrorCardTemplate,
  SolutionCardTemplate,
  BackstageCardTemplate,
}

/**
 * Retorna o elemento React para o template solicitado.
 * Props extras são passadas via spread — cada template extrai apenas o que precisa.
 */
export function getTemplateElement(
  templateType: TemplateType,
  props: TemplateBaseProps & Record<string, unknown>
): React.ReactElement {
  switch (templateType) {
    case 'CAROUSEL':
      return React.createElement(CarouselTemplate, props as never)
    case 'STATIC_LANDSCAPE':
      return React.createElement(StaticLandscapeTemplate, props as never)
    case 'STATIC_PORTRAIT':
      return React.createElement(StaticPortraitTemplate, props as never)
    case 'VIDEO_COVER':
      return React.createElement(VideoCoverTemplate, props as never)
    case 'BEFORE_AFTER':
      return React.createElement(BeforeAfterTemplate, props as never)
    case 'ERROR_CARD':
      return React.createElement(ErrorCardTemplate, props as never)
    case 'SOLUTION_CARD':
      return React.createElement(SolutionCardTemplate, props as never)
    case 'BACKSTAGE_CARD':
      return React.createElement(BackstageCardTemplate, props as never)
    default: {
      const _exhaustive: never = templateType
      throw new Error(`Template desconhecido: ${_exhaustive}`)
    }
  }
}
