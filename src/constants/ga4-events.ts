// ga4-events.ts — Taxonomia de eventos GA4
// INT-106 | COMP-003: apenas disparado após consentimento do usuário

export const GA4_EVENTS = {
  // Analytics Dashboard
  ANALYTICS_PAGE_VIEW: 'analytics_page_view',
  ANALYTICS_PERIOD_CHANGED: 'analytics_period_changed',
  ANALYTICS_EXPORTED: 'analytics_exported',
  ANALYTICS_FUNNEL_VIEWED: 'analytics_funnel_viewed',
  ANALYTICS_THEME_SORTED: 'analytics_theme_sorted',

  // Reconciliação
  RECONCILIATION_PANEL_OPENED: 'reconciliation_panel_opened',
  RECONCILIATION_SYNC_TRIGGERED: 'reconciliation_sync_triggered',
  RECONCILIATION_ITEM_RESOLVED: 'reconciliation_item_resolved',
  RECONCILIATION_ITEM_DELETED: 'reconciliation_item_deleted',
  RECONCILIATION_FILTER_CHANGED: 'reconciliation_filter_changed',

  // Leads
  LEAD_CREATED: 'lead_created',
  LEAD_CONVERTED: 'lead_converted',

  // Conteúdo
  CONTENT_PUBLISHED: 'content_published',
  CONTENT_SCHEDULED: 'content_scheduled',

  // UTM
  UTM_LINK_CREATED: 'utm_link_created',
  UTM_LINK_COPIED: 'utm_link_copied',

  // Auth
  USER_LOGIN: 'user_login',
} as const

export type GA4EventName = (typeof GA4_EVENTS)[keyof typeof GA4_EVENTS]
