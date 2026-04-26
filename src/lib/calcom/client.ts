/**
 * Cal.com API client — Intake Review TASK-1 (CL-105)
 *
 * Wrapper minimo sobre a API v1 do Cal.com. Usamos somente leitura (getBooking,
 * listBookings) para reconciliar um evento `booking.created`/`booking.canceled`
 * recebido via webhook. Escrita (cancelamento, remarcacao) fica a cargo do proprio
 * Cal.com — nao replicamos a superficie da API.
 */

const CAL_COM_API_BASE = 'https://api.cal.com/v1'

export class CalComConfigError extends Error {
  constructor(missing: string) {
    super(`Cal.com config ausente: ${missing}`)
    this.name = 'CalComConfigError'
  }
}

export class CalComApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(`Cal.com API ${status}: ${message}`)
    this.name = 'CalComApiError'
  }
}

export interface CalComBooking {
  id: number
  uid: string
  title: string
  startTime: string
  endTime: string
  status: 'ACCEPTED' | 'PENDING' | 'CANCELLED' | 'REJECTED'
  attendees: Array<{ email: string; name?: string; timeZone?: string }>
  metadata?: Record<string, unknown> | null
}

function getApiKey(): string {
  const key = process.env.CAL_COM_API_KEY
  if (!key) throw new CalComConfigError('CAL_COM_API_KEY')
  return key
}

async function calcomFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiKey = getApiKey()
  const url = new URL(`${CAL_COM_API_BASE}${path}`)
  url.searchParams.set('apiKey', apiKey)

  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new CalComApiError(res.status, body.slice(0, 500))
  }

  return (await res.json()) as T
}

export async function getBooking(id: number | string): Promise<CalComBooking> {
  const data = await calcomFetch<{ booking: CalComBooking }>(`/bookings/${id}`)
  return data.booking
}

export async function listBookings(params: {
  userId?: number
  status?: CalComBooking['status']
  take?: number
} = {}): Promise<CalComBooking[]> {
  const qs = new URLSearchParams()
  if (params.userId) qs.set('userId', String(params.userId))
  if (params.status) qs.set('status', params.status)
  if (params.take) qs.set('take', String(params.take))
  const suffix = qs.toString() ? `&${qs.toString()}` : ''
  const data = await calcomFetch<{ bookings: CalComBooking[] }>(`/bookings?${suffix}`)
  return data.bookings
}

export function getEventUrl(): string {
  const url = process.env.CAL_COM_EVENT_URL
  if (!url) throw new CalComConfigError('CAL_COM_EVENT_URL')
  return url
}
