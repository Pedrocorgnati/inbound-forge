// module-9: BACKSTAGE_CARD Template — dimensao em ./dimensions.ts (BACKSTAGE)
// Canal: Instagram Feed — conteúdo nos bastidores
// CONSTRAINTS: flexbox only, no hooks, no dynamic imports

import React from 'react'
import type { BackstageCardProps } from './types'
import { BRAND_COLOR_DEFAULT } from '../constants'
import { TEMPLATE_TYPE_TO_DIMENSION } from './dimensions'

const DIM = TEMPLATE_TYPE_TO_DIMENSION.BACKSTAGE_CARD

export function BackstageCardTemplate({ headline, subheadline, bodyText, brandColor = BRAND_COLOR_DEFAULT }: BackstageCardProps) {
  return (
    <div
      style={{
        display:         'flex',
        flexDirection:   'column',
        width:           DIM.w,
        height:          DIM.h,
        backgroundColor: '#F8FAFC',
        padding:         72,
        gap:             36,
      }}
    >
      {/* Backstage badge */}
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div
          style={{
            display:         'flex',
            backgroundColor: 'transparent',
            color:           brandColor,
            border:          `3px solid ${brandColor}`,
            padding:         '8px 24px',
            borderRadius:    24,
            fontSize:        20,
            fontWeight:      700,
            letterSpacing:   2,
          }}
        >
          BASTIDORES
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 24, justifyContent: 'center' }}>
        <div style={{ display: 'flex', color: '#0F172A', fontSize: 60, fontWeight: 700, lineHeight: 1.2 }}>
          {headline}
        </div>

        {subheadline && (
          <div style={{ display: 'flex', color: '#475569', fontSize: 30, lineHeight: 1.5 }}>
            {subheadline}
          </div>
        )}

        {bodyText && (
          <div style={{ display: 'flex', color: '#64748B', fontSize: 26, lineHeight: 1.7 }}>
            {bodyText}
          </div>
        )}
      </div>

      {/* Bottom decoration */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', width: 56, height: 5, backgroundColor: brandColor, borderRadius: 3 }} />
        <div style={{ display: 'flex', width: 20, height: 5, backgroundColor: brandColor, borderRadius: 3, opacity: 0.4 }} />
        <div style={{ display: 'flex', width: 8, height: 5, backgroundColor: brandColor, borderRadius: 3, opacity: 0.2 }} />
      </div>
    </div>
  )
}
