'use client'

/**
 * TikTokConnectCard — Inbound Forge
 * TASK-6 ST003 / CL-072 (pos-MVP)
 *
 * Card de conexao TikTok OAuth na tela de integracoes.
 * Apos callback com sucesso, exibe nome da conta + status de auditoria do app.
 * Quando PENDING_AUDIT: aviso que conteudo sera publicado como privado.
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

type ConnectStatus = 'idle' | 'connected' | 'error'

export function TikTokConnectCard() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<ConnectStatus>('idle')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const tiktok = searchParams.get('tiktok')
    if (tiktok === 'connected') {
      setStatus('connected')
      toast.success('TikTok conectado com sucesso!')
    } else if (tiktok === 'error' || tiktok === 'exchange_error' || tiktok === 'invalid_state') {
      setStatus('error')
      toast.error('Falha ao conectar TikTok. Tente novamente.')
    }
  }, [searchParams])

  async function handleConnect() {
    setLoading(true)
    try {
      const res = await fetch('/api/integrations/tiktok/callback', { method: 'POST' })
      if (!res.ok) throw new Error()
      const { authUrl } = await res.json()
      window.location.href = authUrl
    } catch {
      toast.error('Nao foi possivel iniciar a conexao com TikTok.')
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5 space-y-3" data-testid="tiktok-connect-card">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#69C9D0]/10">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#69C9D0]" aria-hidden>
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.28 6.28 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.02a8.16 8.16 0 004.77 1.52V7.1a4.85 4.85 0 01-1-.41z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-foreground">TikTok</p>
          <p className="text-xs text-muted-foreground">
            {status === 'connected' ? 'Conta conectada' : 'Nao conectado'}
          </p>
        </div>
      </div>

      {status === 'connected' && (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
          <span>
            App TikTok aguardando auditoria. Publicacoes serao enviadas como privadas ate aprovacao.
          </span>
        </div>
      )}

      {status !== 'connected' && (
        <Button onClick={handleConnect} disabled={loading} size="sm" data-testid="tiktok-connect-btn">
          {loading ? 'Redirecionando...' : 'Conectar conta TikTok'}
        </Button>
      )}
    </div>
  )
}
