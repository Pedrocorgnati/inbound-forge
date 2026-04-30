-- REMEDIATION M9-G-001: alinhar policies RLS com bucket real (inbound-forge-assets)
-- As policies anteriores apontavam para 'visual-assets' mas o codigo usa
-- SUPABASE_STORAGE_BUCKET=inbound-forge-assets. Esta migration corrige o mismatch.

-- Drop das policies obsoletas que apontam para 'visual-assets'
DROP POLICY IF EXISTS "visual_assets_download_own" ON storage.objects;
DROP POLICY IF EXISTS "visual_assets_upload_own"   ON storage.objects;
DROP POLICY IF EXISTS "visual_assets_update_own"   ON storage.objects;
DROP POLICY IF EXISTS "visual_assets_delete_own"   ON storage.objects;
DROP POLICY IF EXISTS "visual_assets_insert_own"   ON storage.objects;
DROP POLICY IF EXISTS "visual_assets_select_own"   ON storage.objects;

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
