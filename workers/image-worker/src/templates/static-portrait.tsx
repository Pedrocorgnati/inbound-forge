// module-9: STATIC_PORTRAIT Template — 1080x1350
// Canal: Instagram Feed (portrait)
// CONSTRAINTS: flexbox only, no hooks, no dynamic imports

import React from 'react'
import type { StaticPortraitTemplateProps } from './types'
import { BRAND_COLOR_DEFAULT } from '../constants'

export function StaticPortraitTemplate({ headline, subheadline, bodyText, brandColor = BRAND_COLOR_DEFAULT }: StaticPortraitTemplateProps) {
  return (
    <div
      style={{
        display:         'flex',
        flexDirection:   'column',
        width:           1080,
        height:          1350,
        backgroundColor: '#FFFFFF',
        padding:         80,
        justifyContent:  'center',
        gap:             32,
      }}
    >
      {/* Top accent line */}
      <div style={{ display: 'flex', width: 64, height: 6, backgroundColor: brandColor, borderRadius: 3 }} />

      <div style={{ display: 'flex', color: '#0F172A', fontSize: 60, fontWeight: 700, lineHeight: 1.2 }}>
        {headline}
      </div>

      {subheadline && (
        <div style={{ display: 'flex', color: '#475569', fontSize: 32, lineHeight: 1.5 }}>
          {subheadline}
        </div>
      )}

      {bodyText && (
        <div style={{ display: 'flex', color: '#64748B', fontSize: 28, lineHeight: 1.6 }}>
          {bodyText}
        </div>
      )}

      {/* Bottom brand stripe */}
      <div
        style={{
          display:         'flex',
          marginTop:       'auto',
          height:          8,
          backgroundColor: brandColor,
          borderRadius:    4,
        }}
      />
    </div>
  )
}
