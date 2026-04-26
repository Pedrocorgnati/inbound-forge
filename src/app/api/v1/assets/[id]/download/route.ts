/**
 * TASK-7/ST001 (CL-193) — Download de asset em PNG original ou WebP otimizado.
 */
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/api-auth'

type Params = { params: Promise<{ id: string }> }

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'asset'
}

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params
  const format = (request.nextUrl.searchParams.get('format') ?? 'png').toLowerCase()
  if (format !== 'png' && format !== 'webp') {
    return NextResponse.json({ success: false, error: 'Formato invalido' }, { status: 400 })
  }

  const asset = await prisma.visualAsset.findUnique({ where: { id } })
  if (!asset) {
    return NextResponse.json({ success: false, error: 'Asset nao encontrado' }, { status: 404 })
  }

  try {
    const upstream = await fetch(asset.storageUrl)
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ success: false, error: 'Falha ao buscar origem' }, { status: 502 })
    }
    const originalBuffer = Buffer.from(await upstream.arrayBuffer())

    const date = new Date().toISOString().slice(0, 10)
    const baseSlug = slugify(asset.originalName.replace(/\.[^.]+$/, ''))
    const filename = `${baseSlug}-${asset.fileType}-${date}.${format}`

    let output: Buffer = originalBuffer
    let contentType = 'image/png'
    if (format === 'webp') {
      output = await sharp(originalBuffer).webp({ quality: 85 }).toBuffer()
      contentType = 'image/webp'
    }

    return new NextResponse(new Uint8Array(output), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=60',
        'Content-Length': String(output.length),
      },
    })
  } catch (err) {
    console.error('[GET /assets/:id/download]', err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
