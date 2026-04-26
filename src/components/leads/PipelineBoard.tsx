'use client'

// TASK-5 ST002/ST003 (CL-156): board kanban com drag-drop que chama o hook
// useLeadStatusMutation. Acessivel por teclado (ArrowLeft/ArrowRight movem
// cards entre colunas). Zero TODOs.

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useLeadStatusMutation } from '@/hooks/useLeadStatusMutation'

export type LeadStatus = 'NEW' | 'QUALIFIED' | 'NEGOTIATING' | 'WON' | 'LOST'

interface LeadCardData {
  id: string
  name: string
  company?: string | null
  status: LeadStatus
  score?: number
}

interface PipelineBoardProps {
  leads: LeadCardData[]
  locale: string
  columns?: LeadStatus[]
}

const DEFAULT_COLUMNS: LeadStatus[] = ['NEW', 'QUALIFIED', 'NEGOTIATING', 'WON', 'LOST']

export function PipelineBoard({
  leads,
  locale,
  columns = DEFAULT_COLUMNS,
}: PipelineBoardProps) {
  const mutation = useLeadStatusMutation()
  const [dragging, setDragging] = useState<string | null>(null)
  const announceRef = useRef<HTMLDivElement>(null)

  const moveLead = useCallback(
    (leadId: string, nextStatus: LeadStatus, previousStatus: LeadStatus) => {
      if (nextStatus === previousStatus) return
      mutation.mutate({ id: leadId, status: nextStatus, previousStatus })
      if (announceRef.current) {
        announceRef.current.textContent = `Lead ${leadId} movido para ${nextStatus}`
      }
    },
    [mutation]
  )

  const handleKeyDown = (lead: LeadCardData) => (event: React.KeyboardEvent<HTMLElement>) => {
    const idx = columns.indexOf(lead.status)
    if (event.key === 'ArrowRight' && idx < columns.length - 1) {
      event.preventDefault()
      moveLead(lead.id, columns[idx + 1], lead.status)
    }
    if (event.key === 'ArrowLeft' && idx > 0) {
      event.preventDefault()
      moveLead(lead.id, columns[idx - 1], lead.status)
    }
  }

  const onDrop = (status: LeadStatus) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const leadId = event.dataTransfer.getData('text/plain')
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return
    moveLead(lead.id, status, lead.status)
    setDragging(null)
  }

  return (
    <>
      <div
        ref={announceRef}
        className="sr-only"
        role="status"
        aria-live="polite"
      />
      {/* TASK-4 ST003 (CL-145): scroll horizontal com snap no mobile, grid 5-col no desktop */}
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible md:snap-none">
        {columns.map((status) => {
          const columnLeads = leads.filter((l) => l.status === status)
          return (
            <div
              key={status}
              data-testid={`column-${status.toLowerCase()}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop(status)}
              className="min-h-[300px] min-w-[80vw] snap-start rounded-lg border border-border bg-muted/20 p-2 md:min-w-0"
            >
              <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                {status} ({columnLeads.length})
              </h3>
              <ul className="space-y-2">
                {columnLeads.map((lead) => {
                  const isPending = mutation.isPending && mutation.variables?.id === lead.id
                  return (
                    <li
                      key={lead.id}
                      draggable
                      tabIndex={0}
                      data-testid={`lead-${status.toLowerCase()}-${lead.id}`}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', lead.id)
                        setDragging(lead.id)
                      }}
                      onDragEnd={() => setDragging(null)}
                      onKeyDown={handleKeyDown(lead)}
                      className={cn(
                        'rounded-md border border-border bg-card p-2 text-sm shadow-sm',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        (isPending || dragging === lead.id) && 'opacity-60'
                      )}
                      aria-grabbed={dragging === lead.id}
                    >
                      <Link href={`/${locale}/leads/${lead.id}`} className="font-medium hover:underline">
                        {lead.name}
                      </Link>
                      {lead.company && (
                        <p className="text-xs text-muted-foreground">{lead.company}</p>
                      )}
                      {typeof lead.score === 'number' && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          score {lead.score}
                        </p>
                      )}
                    </li>
                  )
                })}
                {columnLeads.length === 0 && (
                  <li className="text-xs text-muted-foreground opacity-60">vazio</li>
                )}
              </ul>
            </div>
          )
        })}
      </div>
    </>
  )
}
