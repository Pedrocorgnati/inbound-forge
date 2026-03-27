'use client'

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BLOG_READING_WPM } from '@/lib/constants/blog'

interface ArticleEditorProps {
  value: string
  onChange: (value: string) => void
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function ArticleEditor({ value, onChange }: ArticleEditorProps) {
  const wordCount = countWords(value)
  const readingTime = Math.max(1, Math.ceil(wordCount / BLOG_READING_WPM))

  const preview = (
    <div
      className="prose prose-sm max-w-none dark:prose-invert overflow-auto rounded-md border border-border bg-background p-4 min-h-[300px] lg:min-h-[500px]"
      aria-live="polite"
      aria-label="Preview do artigo"
    >
      {value.trim() ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
          {value}
        </ReactMarkdown>
      ) : (
        <p className="text-muted-foreground italic">Comece a escrever para ver o preview...</p>
      )}
    </div>
  )

  const editor = (
    <textarea
      aria-label="Editor de conteudo Markdown"
      className="min-h-[300px] lg:min-h-[500px] w-full resize-y rounded-md border border-input bg-background p-4 font-mono text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      placeholder="Escreva seu artigo em Markdown..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )

  return (
    <div className="space-y-2">
      {/* Desktop: side-by-side */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Editor</p>
          {editor}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Preview</p>
          {preview}
        </div>
      </div>

      {/* Mobile: tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="editor">
          <TabsList>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="editor">{editor}</TabsContent>
          <TabsContent value="preview">{preview}</TabsContent>
        </Tabs>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{wordCount} palavras</span>
        <span>{readingTime} min de leitura</span>
      </div>
    </div>
  )
}
