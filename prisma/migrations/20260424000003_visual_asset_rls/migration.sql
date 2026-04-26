-- Intake-Review TASK-20 ST002 (CL-CG-024): habilita RLS em visual_assets
-- com policies explicitas per-user baseadas em auth.uid().
--
-- Pre-requisito: coluna uploaded_by existe (migration 20260424000002).

ALTER TABLE "visual_assets" ENABLE ROW LEVEL SECURITY;

-- SELECT — owner ve apenas seus assets
CREATE POLICY "visual_assets_select_own"
  ON "visual_assets"
  FOR SELECT
  USING (uploaded_by = auth.uid());

-- INSERT — so permite inserir com uploaded_by = auth.uid()
CREATE POLICY "visual_assets_insert_own"
  ON "visual_assets"
  FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

-- UPDATE — owner pode atualizar seus proprios
CREATE POLICY "visual_assets_update_own"
  ON "visual_assets"
  FOR UPDATE
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- DELETE — owner pode deletar seus proprios
CREATE POLICY "visual_assets_delete_own"
  ON "visual_assets"
  FOR DELETE
  USING (uploaded_by = auth.uid());

-- Service role bypass e automatico no Supabase; nenhuma policy extra.

COMMENT ON TABLE "visual_assets" IS
  'RLS enabled 2026-04-24 via intake-review TASK-20 ST002. Policies enforcam uploaded_by = auth.uid() para SELECT/INSERT/UPDATE/DELETE.';
