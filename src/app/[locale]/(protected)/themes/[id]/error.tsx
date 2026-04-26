'use client'

import { Button } from '@/components/ui/button'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl p-4 text-center" data-testid="theme-detail-error">
      <h1 className="text-lg font-semibold">Nao foi possivel carregar este tema</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tente novamente. Se o problema persistir, verifique sua conexao.
      </p>
      <Button onClick={reset} className="mt-4">
        Tentar novamente
      </Button>
    </div>
  )
}
