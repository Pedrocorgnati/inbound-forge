-- Intake-Review TASK-20 ST003 (CL-CG-024): defense-in-depth RLS em tabelas
-- vizinhas com possibilidade de tenancy futura. No MVP single-operator,
-- a policy simplesmente exige auth autenticado (auth.uid() IS NOT NULL).
--
-- Quando multi-tenant for habilitado, cada tabela ganhara coluna
-- tenant_id + policy per-tenant. Ate la, service_role continua sendo
-- bypass canonico para cron/admin e requireSession() e a primeira
-- linha de defesa em API routes.

-- Leads
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_authenticated_rw"
  ON "leads"
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ContentPieces (tabela, se existir com esse nome; ajustar para content_pieces)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='content_pieces') THEN
    EXECUTE 'ALTER TABLE "content_pieces" ENABLE ROW LEVEL SECURITY';
    EXECUTE $POL$
      CREATE POLICY "content_pieces_authenticated_rw"
        ON "content_pieces"
        FOR ALL
        USING (auth.uid() IS NOT NULL)
        WITH CHECK (auth.uid() IS NOT NULL)
    $POL$;
  END IF;
END $$;

-- Themes
ALTER TABLE "themes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "themes_authenticated_rw"
  ON "themes"
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- AuditLog — leitura apenas autenticado (service_role bypass para cron/LGPD_PURGE)
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_authenticated_read"
  ON "audit_logs"
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Writes em audit_logs sao sempre via service_role (auditLog() helper server-only),
-- portanto RLS bloqueia writes por auth.uid() intencionalmente.
