// TASK-21 ST002 (CL-230l): serve o OpenAPI spec (YAML no disco) como JSON.
// Lido sob demanda; runtime=nodejs porque usa fs.

import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const yamlPath = resolve(process.cwd(), 'docs/openapi.yaml')
    const raw = await readFile(yamlPath, 'utf-8')
    // Evita adicionar `yaml` como dependencia: expoe o YAML puro em text/yaml.
    return new NextResponse(raw, {
      status: 200,
      headers: {
        'Content-Type': 'application/yaml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'OpenAPI spec not available' },
      { status: 500 },
    )
  }
}
