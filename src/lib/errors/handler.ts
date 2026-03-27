import { ZodError } from 'zod'
import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/types/base'
import { ERROR_CODES, type ErrorCode } from './codes'

export function handleZodError(error: ZodError): NextResponse<ApiResponse<never>> {
  const details = error.flatten().fieldErrors
  return NextResponse.json<ApiResponse<never>>(
    {
      success: false,
      error: {
        code: 'ERR-001',
        message: ERROR_CODES['ERR-001'],
        details,
      },
    },
    { status: 400 }
  )
}

export function handleApiError(
  code: ErrorCode,
  httpStatus: number = 500,
  details?: unknown
): NextResponse<ApiResponse<never>> {
  return NextResponse.json<ApiResponse<never>>(
    {
      success: false,
      error: { code, message: ERROR_CODES[code], details },
    },
    { status: httpStatus }
  )
}

export function handleUnknownError(error: unknown): NextResponse<ApiResponse<never>> {
  console.error('[API Error]', error) // nunca loga PII — SEC-008
  return handleApiError('ERR-500', 500)
}
