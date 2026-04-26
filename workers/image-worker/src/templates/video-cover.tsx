// module-9: VIDEO_COVER Template — dimensao em ./dimensions.ts (VIDEO_COVER)
// Canal: Instagram / YouTube thumbnail
// CONSTRAINTS: flexbox only, no hooks, no dynamic imports

import React from 'react'
import type { VideoCoverTemplateProps } from './types'
import { BRAND_COLOR_DEFAULT } from '../constants'
import { TEMPLATE_TYPE_TO_DIMENSION } from './dimensions'

const DIM = TEMPLATE_TYPE_TO_DIMENSION.VIDEO_COVER

export function VideoCoverTemplate({ headline, subheadline, showPlayIcon = true, brandColor = BRAND_COLOR_DEFAULT }: VideoCoverTemplateProps) {
  return (
    <div
      style={{
        display:         'flex',
        flexDirection:   'column',
        width:           DIM.w,
        height:          DIM.h,
        backgroundColor: '#0F172A',
        padding:         80,
        justifyContent:  'space-between',
        alignItems:      'center',
      }}
    >
      {/* Top tagline */}
      <div
        style={{
          display:         'flex',
          backgroundColor: brandColor,
          color:           '#FFFFFF',
          padding:         '10px 28px',
          borderRadius:    24,
          fontSize:        22,
          fontWeight:      700,
          letterSpacing:   2,
        }}
      >
        ASSISTA AGORA
      </div>

      {/* Center: play icon */}
      {showPlayIcon && (
        <div
          style={{
            display:         'flex',
            width:           160,
            height:          160,
            borderRadius:    80,
            border:          `6px solid ${brandColor}`,
            alignItems:      'center',
            justifyContent:  'center',
          }}
        >
          {/* Triangle play button using borders */}
          <div
            style={{
              display:     'flex',
              width:        0,
              height:       0,
              borderTop:   '32px solid transparent',
              borderBottom:'32px solid transparent',
              borderLeft:  `56px solid ${brandColor}`,
              marginLeft:  12,
            }}
          />
        </div>
      )}

      {/* Bottom content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
        <div
          style={{
            display:    'flex',
            color:      '#FFFFFF',
            fontSize:   52,
            fontWeight: 700,
            lineHeight: 1.2,
            textAlign:  'center',
          }}
        >
          {headline}
        </div>

        {subheadline && (
          <div style={{ display: 'flex', color: '#94A3B8', fontSize: 28, lineHeight: 1.5, textAlign: 'center' }}>
            {subheadline}
          </div>
        )}

        <div style={{ display: 'flex', width: 64, height: 4, backgroundColor: brandColor, borderRadius: 2 }} />
      </div>
    </div>
  )
}
