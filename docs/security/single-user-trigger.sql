-- Single-User Constraint — TASK-12 ST004 (CL-007)
--
-- Trigger opcional para reforcar a regra "max 1 Operator" no nivel do banco,
-- independente do guard em `src/lib/auth/single-user-guard.ts`.
--
-- Aplicar apenas se o risco de criar Operator fora do caminho HTTP autenticado
-- justificar (ex.: scripts SQL ad-hoc). O guard na aplicacao e suficiente para
-- o MVP.

CREATE OR REPLACE FUNCTION enforce_single_operator()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM operators) > 1 THEN
        RAISE EXCEPTION 'Inbound Forge e single-user — maximo 1 Operator permitido'
            USING ERRCODE = '23514'; -- check_violation
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Dispara depois do INSERT para nao bloquear o insert inicial
CREATE CONSTRAINT TRIGGER tr_single_operator
    AFTER INSERT ON operators
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION enforce_single_operator();

-- Para remover:
-- DROP TRIGGER tr_single_operator ON operators;
-- DROP FUNCTION enforce_single_operator();
