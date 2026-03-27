// module-9: SOLUTION_CARD Template — 1200x630
// Canal: LinkedIn / Blog OG — solução apresentada
// CONSTRAINTS: flexbox only, no hooks, no dynamic imports

import React from 'react'
import type { SolutionCardProps } from './types'
import { BRAND_COLOR_DEFAULT } from '../constants'

export function SolutionCardTemplate({ headline, subheadline, solutionPoints, ctaText, brandColor = BRAND_COLOR_DEFAULT }: SolutionCardProps) {
  // max 3 pontos conforme spec
  const points = solutionPoints.slice(0, 3)

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
      {/* Left accent panel */}
      <div
        style={{
          display:         'flex',
          width:           12,
          backgroundColor: brandColor,
        }}
      />

      {/* Content */}
      <div
        style={{
          display:        'flex',
          flexDirection:  'column',
          flex:           1,
          padding:        60,
          gap:            24,
          justifyContent: 'center',
        }}
      >
        {/* Solution badge */}
        <div style={{ display: 'flex' }}>
          <div
            style={{
              display:         'flex',
              backgroundColor: brandColor,
              color:           '#FFFFFF',
              padding:         '6px 20px',
              borderRadius:    20,
              fontSize:        18,
              fontWeight:      700,
            }}
          >
            SOLUÇÃO
          </div>
        </div>

        <div style={{ display: 'flex', color: '#0F172A', fontSize: 44, fontWeight: 700, lineHeight: 1.2 }}>
          {headline}
        </div>

        {subheadline && (
          <div style={{ display: 'flex', color: '#475569', fontSize: 22, lineHeight: 1.5 }}>
            {subheadline}
          </div>
        )}

        {/* Solution points */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {points.map((point, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div
                style={{
                  display:         'flex',
                  width:           28,
                  height:          28,
                  borderRadius:    14,
                  backgroundColor: brandColor,
                  color:           '#FFFFFF',
                  fontSize:        16,
                  fontWeight:      700,
                  alignItems:      'center',
                  justifyContent:  'center',
                  flexShrink:      0,
                  marginTop:       2,
                }}
              >
                {i + 1}
              </div>
              <div style={{ display: 'flex', color: '#334155', fontSize: 20, lineHeight: 1.5 }}>
                {point}
              </div>
            </div>
          ))}
        </div>

        {ctaText && (
          <div
            style={{
              display:         'flex',
              marginTop:       8,
              backgroundColor: brandColor,
              color:           '#FFFFFF',
              padding:         '12px 28px',
              borderRadius:    8,
              fontSize:        18,
              fontWeight:      600,
              alignSelf:       'flex-start',
            }}
          >
            {ctaText}
          </div>
        )}
      </div>
    </div>
  )
}
