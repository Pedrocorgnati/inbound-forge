// module-9: STATIC_LANDSCAPE Template — 1200x630
// Canal: LinkedIn / Blog OG
// CONSTRAINTS: flexbox only, no hooks, no dynamic imports

import React from 'react'
import type { StaticLandscapeTemplateProps } from './types'
import { BRAND_COLOR_DEFAULT } from '../constants'

export function StaticLandscapeTemplate({ headline, subheadline, bodyText, ctaText, brandColor = BRAND_COLOR_DEFAULT }: StaticLandscapeTemplateProps) {
  return (
    <div
      style={{
        display:         'flex',
        flexDirection:   'row',
        width:           1200,
        height:          630,
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Left: content */}
      <div
        style={{
          display:         'flex',
          flexDirection:   'column',
          flex:            1,
          padding:         60,
          justifyContent:  'center',
          gap:             20,
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', width: 48, height: 4, backgroundColor: brandColor, borderRadius: 2 }} />

        <div style={{ display: 'flex', color: '#0F172A', fontSize: 48, fontWeight: 700, lineHeight: 1.2 }}>
          {headline}
        </div>

        {subheadline && (
          <div style={{ display: 'flex', color: '#475569', fontSize: 24, lineHeight: 1.5 }}>
            {subheadline}
          </div>
        )}

        {bodyText && (
          <div style={{ display: 'flex', color: '#64748B', fontSize: 20, lineHeight: 1.6 }}>
            {bodyText}
          </div>
        )}

        {ctaText && (
          <div
            style={{
              display:         'flex',
              marginTop:       16,
              backgroundColor: brandColor,
              color:           '#FFFFFF',
              padding:         '12px 28px',
              borderRadius:    8,
              fontSize:        20,
              fontWeight:      600,
              alignSelf:       'flex-start',
            }}
          >
            {ctaText}
          </div>
        )}
      </div>

      {/* Right: accent panel */}
      <div
        style={{
          display:         'flex',
          width:           360,
          backgroundColor: brandColor,
          opacity:         0.08,
        }}
      />
    </div>
  )
}
