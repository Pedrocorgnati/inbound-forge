import type { Metadata } from 'next'
import { Suspense } from 'react'
import { UTMLinkListClient } from '@/components/utm/UTMLinkListClient'

export const metadata: Metadata = { title: 'UTM Links' }

export default function UTMPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">UTM Links</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerenciamento de links UTM para rastreamento de conversões
            </p>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[72px] animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </div>
      }
    >
      <UTMLinkListClient />
    </Suspense>
  )
}
