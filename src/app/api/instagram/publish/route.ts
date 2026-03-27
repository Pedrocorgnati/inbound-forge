/**
 * POST /api/instagram/publish — Publicar post no Instagram via Graph API
 * Requer aprovação humana (INT-070). Verifica rate limits e token.
 * module-12-calendar-publishing | POST_050 | SYS_002 | SYS_003
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { InstagramService } from '@/lib/services/instagram.service'
import { z } from 'zod'

const publishSchema = z.object({
  postId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const body = await request.json()
    const { postId } = publishSchema.parse(body)

    const result = await InstagramService.publishPost(postId)
    return ok(result, 201)
  } catch (error) {
    if (error instanceof Error) {
      const err = error as Error & { code?: string }

      if (err.code === 'POST_050') {
        return NextResponse.json(
          { success: false, error: { code: 'POST_050', message: err.message } },
          { status: 403 }
        )
      }
      if (err.code === 'SYS_002') {
        return NextResponse.json(
          { success: false, error: { code: 'SYS_002', message: err.message } },
          { status: 429 }
        )
      }
      if (err.code === 'SYS_003') {
        return NextResponse.json(
          { success: false, error: { code: 'SYS_003', message: err.message } },
          { status: 401 }
        )
      }
      if (err.code === 'SYS_004') {
        return NextResponse.json(
          { success: false, error: { code: 'SYS_004', message: err.message } },
          { status: 400 }
        )
      }
    }
    return internalError()
  }
}
