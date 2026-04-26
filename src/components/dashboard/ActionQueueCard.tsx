'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ActionItem {
  id: string
  label: string
  href: string
}

interface ActionQueueCardProps {
  actions: ActionItem[]
  locale: string
}

export function ActionQueueCard({ actions, locale }: ActionQueueCardProps) {
  return (
    <Card data-testid="action-queue-card">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Fila de Ações</CardTitle>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma ação pendente. Bom trabalho!</p>
        ) : (
          <ul className="space-y-2">
            {actions.slice(0, 5).map((a) => (
              <li key={a.id} className="flex justify-between items-center gap-2">
                <span className="text-sm truncate">{a.label}</span>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/${locale}${a.href}`}>Resolver</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
