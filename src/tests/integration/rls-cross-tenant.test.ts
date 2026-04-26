/**
 * Intake-Review TASK-20 ST004 (CL-CG-024): validacao automatizada de RLS
 * cross-tenant no bucket 'visual-assets' + na tabela visual_assets.
 *
 * Pre-requisitos:
 *   - Migrations 20260424000002..000004 aplicadas
 *   - Storage policies (storage-policies.sql) aplicadas
 *   - Bucket 'visual-assets' criado
 *   - 2 usuarios de teste criados no Supabase Auth com credenciais em
 *     envs TEST_RLS_USER_A_EMAIL/PASSWORD e TEST_RLS_USER_B_EMAIL/PASSWORD
 *
 * Roda apenas em staging/CI — pula se envs ausentes.
 */
import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SHOULD_RUN = SUPABASE_URL && SUPABASE_ANON
  && process.env.TEST_RLS_USER_A_EMAIL && process.env.TEST_RLS_USER_A_PASSWORD
  && process.env.TEST_RLS_USER_B_EMAIL && process.env.TEST_RLS_USER_B_PASSWORD

async function login(email: string, password: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON)
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return { client, userId: data.user!.id }
}

describe.runIf(SHOULD_RUN)('RLS cross-tenant — visual-assets', () => {
  let clientA: ReturnType<typeof createClient>
  let userIdA: string
  let clientB: ReturnType<typeof createClient>
  let assetPathA: string
  let assetIdA: string

  beforeAll(async () => {
    const sessionA = await login(process.env.TEST_RLS_USER_A_EMAIL!, process.env.TEST_RLS_USER_A_PASSWORD!)
    clientA = sessionA.client
    userIdA = sessionA.userId
    const sessionB = await login(process.env.TEST_RLS_USER_B_EMAIL!, process.env.TEST_RLS_USER_B_PASSWORD!)
    clientB = sessionB.client

    // User A uploada 1 asset (via admin route — simulamos aqui com insert direto
    // usando o proprio client autenticado, que passa pelo RLS check)
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    assetPathA = `${userIdA}/rls-test-${Date.now()}.png`

    const { error: upErr } = await clientA.storage
      .from('visual-assets')
      .upload(assetPathA, bytes, { contentType: 'image/png' })
    if (upErr) throw upErr

    const { data: row, error: rowErr } = await clientA
      .from('visual_assets')
      .insert({
        file_name:       assetPathA.split('/').pop()!,
        original_name:   'rls-test.png',
        file_type:       'image/png',
        file_size_bytes: 8,
        storage_url:     `${SUPABASE_URL}/storage/v1/object/public/visual-assets/${assetPathA}`,
        uploaded_by:     userIdA,
      })
      .select('id')
      .single()
    if (rowErr) throw rowErr
    assetIdA = row.id as string
  }, 30_000)

  afterAll(async () => {
    // cleanup
    await clientA.from('visual_assets').delete().eq('id', assetIdA)
    await clientA.storage.from('visual-assets').remove([assetPathA])
  })

  it('user B nao consegue listar assets de user A via tabela', async () => {
    const { data } = await clientB.from('visual_assets').select('id').eq('id', assetIdA)
    expect(data ?? []).toHaveLength(0)
  })

  it('user B nao consegue fazer SELECT direto no storage path de user A', async () => {
    const { data } = await clientB.storage.from('visual-assets').download(assetPathA)
    expect(data).toBeNull()
  })

  it('user B nao consegue deletar asset de user A', async () => {
    await clientB.from('visual_assets').delete().eq('id', assetIdA)
    // Policy RLS impede; Supabase retorna "0 rows affected" (nao erro),
    // portanto validamos que o row continua existindo.
    const { data } = await clientA.from('visual_assets').select('id').eq('id', assetIdA).single()
    expect(data?.id).toBe(assetIdA)
  })

  it('user B consegue fazer upload para seu proprio path', async () => {
    const pathB = `${(await clientB.auth.getUser()).data.user!.id}/rls-selftest-${Date.now()}.png`
    const { error } = await clientB.storage
      .from('visual-assets')
      .upload(pathB, new Uint8Array([0x89, 0x50, 0x4e, 0x47]), { contentType: 'image/png' })
    expect(error).toBeNull()
    await clientB.storage.from('visual-assets').remove([pathB])
  })
})
