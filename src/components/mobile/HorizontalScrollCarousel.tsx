'use client'

// RESOLVED G01 (B02): HorizontalScrollCarousel — scroll horizontal nativo com snap
// Utilizado para listas de cards em mobile que seriam exibidas em grid em desktop

import React, { useRef } from 'react'
import { cn } from '@/lib/utils'

interface HorizontalScrollCarouselProps {
  children: React.ReactNode
  /** Classe adicional para o container externo */
  className?: string
  /** Classe adicional para cada item do carrossel */
  itemClassName?: string
  /** Label acessível para o region */
  ariaLabel?: string
}

/**
 * Carrossel horizontal com scroll nativo e snap para mobile.
 * Em desktop, os filhos são exibidos normalmente (sem scroll forçado).
 *
 * @example
 * <HorizontalScrollCarousel>
 *   {cards.map(card => <CardComponent key={card.id} {...card} />)}
 * </HorizontalScrollCarousel>
 */
export function HorizontalScrollCarousel({
  children,
  className,
  itemClassName,
  ariaLabel = 'Carrossel horizontal',
}: HorizontalScrollCarouselProps) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      className={cn(
        // Mobile: scroll horizontal com snap
        'flex gap-3 overflow-x-auto scroll-smooth',
        'snap-x snap-mandatory',
        // Sangria negativa para mostrar que há mais conteúdo além da borda
        '-mx-4 px-4',
        // Padding bottom para scrollbar não sobrepor conteúdo
        'pb-2',
        // Sem scrollbar visível (usa ::-webkit-scrollbar do globals.css — 6px)
        className
      )}
    >
      {React.Children.map(children, (child, i) => (
        <div
          key={i}
          className={cn(
            'shrink-0 snap-start',
            itemClassName
          )}
        >
          {child}
        </div>
      ))}
    </div>
  )
}
