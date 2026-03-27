'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Linkedin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LinkedInPostPreviewProps {
  formattedText: string
  hashtags: string[]
  imageUrl?: string
  charCount: number
}

const VISIBLE_CHARS = 200

export function LinkedInPostPreview({
  formattedText,
  hashtags,
  imageUrl,
  charCount,
}: LinkedInPostPreviewProps) {
  const [expanded, setExpanded] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const isLong = formattedText.length > VISIBLE_CHARS
  const displayText = isLong && !expanded
    ? formattedText.slice(0, VISIBLE_CHARS) + '...'
    : formattedText

  return (
    <div>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setShowPreview((v) => !v)}
        className="flex w-full items-center justify-between rounded-md border border-border bg-muted px-4 py-2 text-sm font-medium md:hidden"
      >
        <span>{showPreview ? 'Ocultar preview' : 'Mostrar preview'}</span>
        {showPreview ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      <div
        className={cn('mt-2 md:mt-0 md:block', !showPreview && 'hidden md:block')}
        aria-label="Pre-visualizacao do post no LinkedIn"
      >
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-200">
              <Linkedin className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Seu perfil</p>
              <p className="text-xs text-gray-500">Agora</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-4 pb-2">
            <p className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
              {displayText}
            </p>

            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                {expanded ? 'Ver menos' : 'Ver mais'}
              </button>
            )}

            {hashtags.length > 0 && (
              <p className="mt-2 text-sm text-blue-600">
                {hashtags.join(' ')}
              </p>
            )}
          </div>

          {/* Image */}
          {imageUrl && (
            <div className="border-t border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Imagem do post"
                className="w-full object-cover"
                style={{ maxHeight: 300 }}
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
            <span className="text-xs text-gray-400">{charCount} caracteres</span>
          </div>
        </div>
      </div>
    </div>
  )
}
