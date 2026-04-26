import { NextResponse } from 'next/server'
import { getScrapingHealth } from '@/lib/services/scraping-health.service'

export async function GET() {
  const snapshot = await getScrapingHealth()
  return NextResponse.json(snapshot, {
    headers: { 'Cache-Control': 'private, max-age=30' },
  })
}
