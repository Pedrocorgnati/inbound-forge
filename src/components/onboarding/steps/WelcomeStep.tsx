'use client'

import { Rocket, Zap, Shield, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WelcomeStepProps {
  onComplete: () => void
}

const BENEFITS = [
  {
    icon: Zap,
    title: 'Conteudo automatizado',
    description: 'Gere conteudo de inbound marketing com IA, otimizado para seu nicho.',
  },
  {
    icon: Shield,
    title: 'Base de conhecimento',
    description: 'Cases, dores e padroes de solucao organizados para alimentar o motor.',
  },
  {
    icon: BarChart3,
    title: 'Publicacao inteligente',
    description: 'Calendario editorial, agendamento e distribuicao multicanal.',
  },
  {
    icon: Rocket,
    title: 'Leads qualificados',
    description: 'Capture e qualifique leads com conteudo relevante e direcionado.',
  },
] as const

export function WelcomeStep({ onComplete }: WelcomeStepProps) {
  return (
    <div data-testid="welcome-step" className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Rocket className="h-8 w-8 text-primary" />
        </div>
        <p className="text-muted-foreground">
          O Inbound Forge e sua ferramenta pessoal de inbound marketing automatizado.
          Vamos configurar tudo em poucos minutos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {BENEFITS.map((benefit) => (
          <div
            key={benefit.title}
            className="flex gap-3 rounded-lg border border-border p-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <benefit.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">{benefit.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{benefit.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <Button
          data-testid="welcome-start-btn"
          size="lg"
          onClick={onComplete}
        >
          Comecar configuracao
        </Button>
      </div>
    </div>
  )
}
