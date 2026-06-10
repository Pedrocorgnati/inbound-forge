'use client'

import { Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ScheduleSelectorProps {
  value: string
  onChange: (value: string) => void
}

const START_HOUR = 9
const END_HOUR = 18
const WINDOW_DAYS = 14

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function toLocalInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function startOfWindow(): Date {
  const date = new Date()
  date.setMinutes(0, 0, 0)
  if (date.getHours() < START_HOUR) date.setHours(START_HOUR)
  if (date.getHours() >= END_HOUR) {
    date.setDate(date.getDate() + 1)
    date.setHours(START_HOUR)
  }
  return date
}

function endOfWindow(): Date {
  const date = startOfWindow()
  date.setDate(date.getDate() + WINDOW_DAYS)
  date.setHours(END_HOUR, 0, 0, 0)
  return date
}

export function getDefaultInstagramScheduleValue(current?: string | null): string {
  if (current) return toLocalInputValue(new Date(current))
  const date = startOfWindow()
  if (date.getDay() === 0) date.setDate(date.getDate() + 1)
  if (date.getDay() === 6) date.setDate(date.getDate() + 2)
  return toLocalInputValue(date)
}

export function isInstagramScheduleInsideWindow(value: string): boolean {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const day = date.getDay()
  const hour = date.getHours()
  return date >= startOfWindow() && date <= endOfWindow() && day >= 1 && day <= 5 && hour >= START_HOUR && hour < END_HOUR
}

export function ScheduleSelector({ value, onChange }: ScheduleSelectorProps) {
  const min = toLocalInputValue(startOfWindow())
  const max = toLocalInputValue(endOfWindow())
  const valid = isInstagramScheduleInsideWindow(value)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" aria-hidden />
          Horário
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          type="datetime-local"
          value={value}
          min={min}
          max={max}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-invalid={!valid}
          aria-describedby="instagram-schedule-status"
        />
        <p id="instagram-schedule-status" className={valid ? 'text-xs text-muted-foreground' : 'text-xs text-red-600'}>
          {valid
            ? 'Janela válida: dias úteis, 09:00-18:00, próximos 14 dias.'
            : 'Escolha um dia útil entre 09:00 e 18:00 nos próximos 14 dias.'}
        </p>
      </CardContent>
    </Card>
  )
}
