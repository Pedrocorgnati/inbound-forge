// module-9: BEFORE_AFTER Template — dimensao em ./dimensions.ts (INSTAGRAM_FEED)
// Canal: Instagram Feed (portrait)
// CONSTRAINTS: flexbox only, no hooks, no dynamic imports

import React from 'react'
import type { BeforeAfterTemplateProps } from './types'
import { BRAND_COLOR_DEFAULT } from '../constants'
import { TEMPLATE_TYPE_TO_DIMENSION } from './dimensions'

const DIM = TEMPLATE_TYPE_TO_DIMENSION.BEFORE_AFTER

export function BeforeAfterTemplate({
  headline,
  subheadline,
  beforeText,
  afterText,
  beforeLabel = 'Antes',
  afterLabel  = 'Depois',
  brandColor  = BRAND_COLOR_DEFAULT,
}: BeforeAfterTemplateProps) {
  return (
    <div
      style={{
        display:         'flex',
        flexDirection:   'column',
        width:           DIM.w,
        height:          DIM.h,
        backgroundColor: '#0F172A',
        padding:         64,
        gap:             48,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', width: 56, height: 5, backgroundColor: brandColor, borderRadius: 3 }} />
        <div style={{ display: 'flex', color: '#FFFFFF', fontSize: 52, fontWeight: 700, lineHeight: 1.2 }}>
          {headline}
        </div>
        {subheadline && (
          <div style={{ display: 'flex', color: '#94A3B8', fontSize: 28, lineHeight: 1.5 }}>
            {subheadline}
          </div>
        )}
      </div>

      {/* Before / After cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>
        {/* Before card */}
        <div
          style={{
            display:         'flex',
            flexDirection:   'column',
            flex:            1,
            backgroundColor: '#1E293B',
            borderRadius:    16,
            padding:         40,
            gap:             16,
            borderLeft:      '6px solid #EF4444',
          }}
        >
          <div
            style={{
              display:         'flex',
              alignSelf:       'flex-start',
              backgroundColor: '#EF4444',
              color:           '#FFFFFF',
              padding:         '6px 20px',
              borderRadius:    20,
              fontSize:        20,
              fontWeight:      700,
            }}
          >
            {beforeLabel}
          </div>
          <div style={{ display: 'flex', color: '#CBD5E1', fontSize: 26, lineHeight: 1.6 }}>
            {beforeText}
          </div>
        </div>

        {/* After card */}
        <div
          style={{
            display:         'flex',
            flexDirection:   'column',
            flex:            1,
            backgroundColor: '#1E293B',
            borderRadius:    16,
            padding:         40,
            gap:             16,
            borderLeft:      `6px solid ${brandColor}`,
          }}
        >
          <div
            style={{
              display:         'flex',
              alignSelf:       'flex-start',
              backgroundColor: brandColor,
              color:           '#FFFFFF',
              padding:         '6px 20px',
              borderRadius:    20,
              fontSize:        20,
              fontWeight:      700,
            }}
          >
            {afterLabel}
          </div>
          <div style={{ display: 'flex', color: '#E2E8F0', fontSize: 26, lineHeight: 1.6 }}>
            {afterText}
          </div>
        </div>
      </div>
    </div>
  )
}
