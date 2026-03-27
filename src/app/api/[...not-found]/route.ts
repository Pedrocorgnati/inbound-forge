import { NextResponse } from 'next/server'

// Catch-all para API routes inexistentes — retorna JSON 404 em vez de HTML
// B-003: Global 404 handler para /api/*
function notFoundHandler() {
  return NextResponse.json(
    { code: 'SYS_404', message: 'Rota não encontrada.' },
    { status: 404 }
  )
}

export const GET = notFoundHandler
export const POST = notFoundHandler
export const PUT = notFoundHandler
export const PATCH = notFoundHandler
export const DELETE = notFoundHandler
