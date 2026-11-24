-- ==============================================================================
-- Migração 004: Cadastro de Pessoas (PF) e Empresas (PJ) e Dados Fiscais (SPEC-1.6)
-- Requisitos: RF-001 e RF-002
-- ==============================================================================

-- 1. Tabela: pessoas_empresas (RF-001 / CA-1 / CA-2)
CREATE TABLE IF NOT EXISTS pessoas_empresas (
    id VARCHAR(36) PRIMARY KEY,
    organizacao_id VARCHAR(36) NOT NULL REFERENCES organizacoes(id) ON DELETE RESTRICT,
    tipo_pessoa VARCHAR(2) NOT NULL CHECK (tipo_pessoa IN ('PF', 'PJ')),
    nome_razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    documento VARCHAR(14) NOT NULL, -- CPF (11 dígitos) ou CNPJ (14 dígitos) sem máscara
    inscricao_estadual VARCHAR(50),
    inscricao_municipal VARCHAR(50),
    contatos JSONB NOT NULL DEFAULT '[]',
    enderecos JSONB NOT NULL DEFAULT '[]',
    responsaveis JSONB NOT NULL DEFAULT '[]',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    -- Impede duplicidade de CPF/CNPJ dentro da mesma organização (CA-2)
    CONSTRAINT uq_pessoas_empresas_organizacao_documento UNIQUE (organizacao_id, documento)
);

-- 2. Tabela: dados_fiscais_vigencia (RF-002 / CA-3 / CA-4)
CREATE TABLE IF NOT EXISTS dados_fiscais_vigencia (
    id VARCHAR(36) PRIMARY KEY,
    pessoa_empresa_id VARCHAR(36) NOT NULL REFERENCES pessoas_empresas(id) ON DELETE CASCADE,
    regime_tributario VARCHAR(100) NOT NULL,
    atividade_economica VARCHAR(255) NOT NULL,
    cnae VARCHAR(20) NOT NULL,
    natureza_juridica VARCHAR(100) NOT NULL,
    municipio VARCHAR(150) NOT NULL,
    uf CHAR(2) NOT NULL,
    enquadramentos JSONB NOT NULL DEFAULT '[]',
    vigencia_inicio DATE NOT NULL,
    vigencia_fim DATE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    -- Garante que a data final não seja anterior à data inicial de vigência (CA-4)
    CONSTRAINT chk_dados_fiscais_vigencia CHECK (vigencia_fim IS NULL OR vigencia_fim >= vigencia_inicio)
);
