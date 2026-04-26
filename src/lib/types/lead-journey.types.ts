/**
 * TASK-8/ST001 (CL-202) — Tipos para timeline de jornada do lead.
 */

export type LeadEventType =
  | 'post-view'
  | 'form-submit'
  | 'conversion'
  | 'utm-click'
  | 'email-open'

interface BaseEvent {
  id: string
  occurredAt: string
  type: LeadEventType
}

export interface PostViewEvent extends BaseEvent {
  type: 'post-view'
  postSlug: string
  postTitle: string
  readTimeSeconds?: number
}

export interface FormSubmitEvent extends BaseEvent {
  type: 'form-submit'
  formName: string
  source?: string
}

export interface ConversionEvent extends BaseEvent {
  type: 'conversion'
  conversionType: string
  value?: number
  notes?: string
}

export interface UtmClickEvent extends BaseEvent {
  type: 'utm-click'
  utmSource: string
  utmMedium: string
  utmCampaign: string
}

export interface EmailOpenEvent extends BaseEvent {
  type: 'email-open'
  subject: string
}

export type LeadJourneyEvent =
  | PostViewEvent
  | FormSubmitEvent
  | ConversionEvent
  | UtmClickEvent
  | EmailOpenEvent

export const EVENT_TYPES: LeadEventType[] = [
  'post-view',
  'form-submit',
  'conversion',
  'utm-click',
  'email-open',
]

const ICON_MAP: Record<LeadEventType, string> = {
  'post-view': 'Eye',
  'form-submit': 'FileText',
  conversion: 'CheckCircle',
  'utm-click': 'MousePointer',
  'email-open': 'Mail',
}

const COLOR_MAP: Record<LeadEventType, string> = {
  'post-view': 'bg-blue-500',
  'form-submit': 'bg-purple-500',
  conversion: 'bg-green-500',
  'utm-click': 'bg-amber-500',
  'email-open': 'bg-pink-500',
}

export function mapEventToIcon(type: LeadEventType): string {
  return ICON_MAP[type]
}

export function mapEventToColor(type: LeadEventType): string {
  return COLOR_MAP[type]
}

export function mapEventToLabel(
  event: LeadJourneyEvent,
  t: (key: string) => string
): string {
  switch (event.type) {
    case 'post-view':
      return `${t('postView')}: ${event.postTitle}`
    case 'form-submit':
      return `${t('formSubmit')}: ${event.formName}`
    case 'conversion':
      return `${t('conversion')}: ${event.conversionType}`
    case 'utm-click':
      return `${t('utmClick')}: ${event.utmCampaign}`
    case 'email-open':
      return `${t('emailOpen')}: ${event.subject}`
  }
}
