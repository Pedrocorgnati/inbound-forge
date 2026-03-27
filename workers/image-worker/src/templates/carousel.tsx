// module-9: CAROUSEL Template — 1080x1080
// Rastreabilidade: TASK-2 ST002, INT-061, FEAT-creative-generation-005
// CONSTRAINTS: flexbox only, no hooks, no dynamic imports, explicit dimensions

import React from 'react'
import type { CarouselTemplateProps } from './types'
import { BRAND_COLOR_DEFAULT } from '../constants'

export function CarouselTemplate({ headline, subheadline, bodyText, slideNumber, totalSlides, brandColor = BRAND_COLOR_DEFAULT }: CarouselTemplateProps) {
  return (
    <div
      style={{
        display:         'flex',
        flexDirection:   'column',
        width:           1080,
        height:          1080,
        backgroundColor: '#0F172A',
        padding:         60,
        justifyContent:  'space-between',
      }}
    >
      {/* Slide indicator */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            display:         'flex',
            backgroundColor: brandColor,
            color:           '#FFFFFF',
            padding:         '8px 20px',
            borderRadius:    24,
            fontSize:        22,
            fontWeight:      700,
          }}
        >
          {slideNumber} / {totalSlides}
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            display:    'flex',
            color:      brandColor,
            fontSize:   64,
            fontWeight: 700,
            lineHeight: 1.15,
          }}
        >
          {headline}
        </div>

        {subheadline && (
          <div style={{ display: 'flex', color: '#94A3B8', fontSize: 30, lineHeight: 1.5 }}>
            {subheadline}
          </div>
        )}

        <div style={{ display: 'flex', color: '#E2E8F0', fontSize: 28, lineHeight: 1.6 }}>
          {bodyText}
        </div>
      </div>

      {/* Bottom accent */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', width: 48, height: 4, backgroundColor: brandColor, borderRadius: 2 }} />
        <div style={{ display: 'flex', color: '#64748B', fontSize: 20 }}>Deslize para ver mais</div>
      </div>
    </div>
  )
}
