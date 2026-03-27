'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useContentEditor, type UseContentEditorReturn } from '@/hooks/useContentEditor'

const ContentEditorContext = createContext<UseContentEditorReturn | null>(null)

interface ContentEditorProviderProps {
  themeId: string
  children: ReactNode
}

export function ContentEditorProvider({ themeId, children }: ContentEditorProviderProps) {
  const editor = useContentEditor(themeId)

  return (
    <ContentEditorContext.Provider value={editor}>
      {children}
    </ContentEditorContext.Provider>
  )
}

export function useContentEditorContext(): UseContentEditorReturn {
  const ctx = useContext(ContentEditorContext)
  if (!ctx) {
    throw new Error('useContentEditorContext deve ser usado dentro de ContentEditorProvider')
  }
  return ctx
}
