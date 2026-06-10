'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useContentEditor, type UseContentEditorReturn } from '@/hooks/useContentEditor'

const ContentEditorContext = createContext<UseContentEditorReturn | null>(null)

interface ContentEditorProviderProps {
  themeId: string
  initialAngleId?: string
  initialChannel?: string
  children: ReactNode
}

export function ContentEditorProvider({ themeId, initialAngleId, initialChannel, children }: ContentEditorProviderProps) {
  const editor = useContentEditor(themeId, initialAngleId, initialChannel)

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
