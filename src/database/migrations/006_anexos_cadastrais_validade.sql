-- ==============================================================================
-- Migração 006: Anexos Cadastrais com Controle de Validade e Alertas (SPEC-1.8)
-- Requisito: RF-003
-- ==============================================================================

CREATE TABLE IF NOT EXISTS anexos_cadastrais (
    id VARCHAR(36) PRIMARY KEY,
    organizacao_id VARCHAR(36) NOT NULL REFERENCES organizacoes(id) ON DELETE RESTRICT,
    pessoa_empresa_id VARCHAR(36) NOT NULL REFERENCES pessoas_empresas(id) ON DELETE CASCADE,
    tipo_anexo VARCHAR(40) NOT NULL CHECK (
        tipo_anexo IN ('CONTRATO_SOCIAL', 'PROCURACAO', 'DOCUMENTO_CADASTRAL', 'CERTIFICADO', 'OUTRO')
    ),
    nome_arquivo VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    tamanho_bytes INTEGER NOT NULL CHECK (tamanho_bytes > 0),
    caminho_ou_hash_arquivo VARCHAR(500) NOT NULL,
    data_emissao DATE,
    data_validade DATE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_anexos_validade_emissao CHECK (
        data_validade IS NULL OR data_emissao IS NULL OR data_validade >= data_emissao
    )
);

CREATE INDEX IF NOT EXISTS idx_anexos_cadastrais_pessoa_empresa ON anexos_cadastrais(pessoa_empresa_id);
CREATE INDEX IF NOT EXISTS idx_anexos_cadastrais_validade ON anexos_cadastrais(data_validade);
