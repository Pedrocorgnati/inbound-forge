// module-9: ERROR_CARD Template — dimensao em ./dimensions.ts (INSTAGRAM_FEED)
// Canal: Instagram Feed — problema/dor do cliente
// CONSTRAINTS: flexbox only, no hooks, no dynamic imports

import React from 'react'
import type { ErrorCardProps } from './types'
import { BRAND_COLOR_DEFAULT } from '../constants'
import { TEMPLATE_TYPE_TO_DIMENSION } from './dimensions'

const DIM = TEMPLATE_TYPE_TO_DIMENSION.ERROR_CARD

export function ErrorCardTemplate({ headline, subheadline, errorDescription, impactText, brandColor = BRAND_COLOR_DEFAULT }: ErrorCardProps) {
  return (
    <div
      style={{
        display:         'flex',
        flexDirection:   'column',
        width:           DIM.w,
        height:          DIM.h,
        backgroundColor: '#0F172A',
        padding:         72,
        gap:             48,
      }}
    >
      {/* Warning badge */}
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div
          style={{
            display:         'flex',
            backgroundColor: '#EF4444',
            color:           '#FFFFFF',
            padding:         '10px 28px',
            borderRadius:    24,
            fontSize:        20,
            fontWeight:      700,
            letterSpacing:   1,
          }}
        >
          ATENÇÃO
        </div>
      </div>

      {/* Main headline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', color: '#FFFFFF', fontSize: 56, fontWeight: 700, lineHeight: 1.15 }}>
          {headline}
        </div>
        {subheadline && (
          <div style={{ display: 'flex', color: '#94A3B8', fontSize: 30, lineHeight: 1.5 }}>
            {subheadline}
          </div>
        )}
      </div>

      {/* Error description box */}
      <div
        style={{
          display:         'flex',
          flexDirection:   'column',
          backgroundColor: '#1E293B',
          borderRadius:    16,
          padding:         40,
          gap:             16,
          borderLeft:      '8px solid #EF4444',
          flex:            1,
        }}
      >
        <div style={{ display: 'flex', color: '#F87171', fontSize: 22, fontWeight: 700 }}>O problema</div>
        <div style={{ display: 'flex', color: '#CBD5E1', fontSize: 26, lineHeight: 1.6 }}>
          {errorDescription}
        </div>
      </div>

      {/* Impact text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', width: 48, height: 4, backgroundColor: brandColor, borderRadius: 2 }} />
        <div style={{ display: 'flex', color: '#64748B', fontSize: 24, lineHeight: 1.5 }}>
          {impactText}
        </div>
      </div>
    </div>
  )
}
