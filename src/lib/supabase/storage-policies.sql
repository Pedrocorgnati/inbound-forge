-- Intake-Review TASK-20 ST002 (CL-CG-024): policies para bucket
-- 'visual-assets' no Supabase Storage. Isolamento per-user via primeiro
-- segmento do path (<uid>/...).
--
-- Aplicacao: rodar manualmente via Supabase Dashboard > Storage > Policies
-- ou via SQL Editor (tabela storage.objects).

-- SELECT — operator ve apenas arquivos em <own-uid>/
CREATE POLICY "visual_assets_download_own"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'visual-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- INSERT — operator so pode uploadar para <own-uid>/
CREATE POLICY "visual_assets_upload_own"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'visual-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE — owner atualiza seus proprios arquivos
CREATE POLICY "visual_assets_update_own"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'visual-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'visual-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE — owner deleta seus proprios
CREATE POLICY "visual_assets_delete_own"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'visual-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
