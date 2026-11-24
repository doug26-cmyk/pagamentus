-- ==============================================================================
-- Migração 007: Trilha de Auditoria e Histórico Cadastral Imutável (SPEC-1.9)
-- Requisitos: RF-015, RF-004, RNF-004 e RB-007
-- ==============================================================================

-- 1. Tabela append-only de auditoria e histórico cadastral
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id VARCHAR(36) PRIMARY KEY,
    organizacao_id VARCHAR(36) NOT NULL REFERENCES organizacoes(id) ON DELETE RESTRICT,
    usuario_id VARCHAR(36) NOT NULL,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    objeto_tipo VARCHAR(100) NOT NULL,
    objeto_id VARCHAR(100) NOT NULL,
    operacao VARCHAR(30) NOT NULL CHECK (
        operacao IN ('INCLUSAO', 'ALTERACAO', 'EXCLUSAO_LOGICA', 'ESTORNO', 'APROVACAO')
    ),
    resultado VARCHAR(20) NOT NULL CHECK (resultado IN ('SUCESSO', 'FALHA')),
    justificativa TEXT NOT NULL,
    dados_anteriores JSONB,
    dados_novos JSONB,
    hash_integridade VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_auditoria_objeto ON logs_auditoria(objeto_id);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_organizacao ON logs_auditoria(organizacao_id);

-- 2. Proteção contra edição ou exclusão de logs de auditoria (RNF-004 / RB-007 / CA-3)
CREATE OR REPLACE FUNCTION impedir_mutacao_logs_auditoria()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operação bloqueada: logs de auditoria são imutáveis e não podem ser editados ou excluídos (RNF-004).';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloquear_update_delete_logs_auditoria ON logs_auditoria;
CREATE TRIGGER trg_bloquear_update_delete_logs_auditoria
BEFORE UPDATE OR DELETE ON logs_auditoria
FOR EACH ROW EXECUTE FUNCTION impedir_mutacao_logs_auditoria();
