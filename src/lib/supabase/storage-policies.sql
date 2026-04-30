-- Intake-Review TASK-20 ST002 (CL-CG-024): policies para bucket
-- 'inbound-forge-assets' no Supabase Storage. Isolamento per-user via primeiro
-- segmento do path (<uid>/...).
--
-- REMEDIATION M9-G-001: bucket alinhado com SUPABASE_STORAGE_BUCKET=inbound-forge-assets
--
-- Aplicacao: rodar manualmente via Supabase Dashboard > Storage > Policies
-- ou via SQL Editor (tabela storage.objects).

-- Drop das policies antigas (bucket 'visual-assets') se existirem
DROP POLICY IF EXISTS "visual_assets_download_own" ON storage.objects;
DROP POLICY IF EXISTS "visual_assets_upload_own"   ON storage.objects;
DROP POLICY IF EXISTS "visual_assets_update_own"   ON storage.objects;
DROP POLICY IF EXISTS "visual_assets_delete_own"   ON storage.objects;
DROP POLICY IF EXISTS "visual_assets_insert_own"   ON storage.objects;
DROP POLICY IF EXISTS "visual_assets_select_own"   ON storage.objects;
DROP POLICY IF EXISTS "visual_assets_delete_own"   ON storage.objects;

-- SELECT — operator ve apenas arquivos em <own-uid>/
CREATE POLICY "visual_assets_download_own"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'inbound-forge-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- INSERT — operator so pode uploadar para <own-uid>/
CREATE POLICY "visual_assets_upload_own"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'inbound-forge-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE — owner atualiza seus proprios arquivos
CREATE POLICY "visual_assets_update_own"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'inbound-forge-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'inbound-forge-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE — owner deleta seus proprios
CREATE POLICY "visual_assets_delete_own"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'inbound-forge-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
