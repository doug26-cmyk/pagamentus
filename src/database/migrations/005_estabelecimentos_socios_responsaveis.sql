-- ==============================================================================
-- Migração 005: Estabelecimentos, Filiais, Sócios e Responsáveis Técnicos (SPEC-1.7)
-- Requisito: RF-005
-- ==============================================================================

-- 1. Tabela: estabelecimentos (Matriz e Filiais vinculadas à organização - CA-1 / CA-4)
CREATE TABLE IF NOT EXISTS estabelecimentos (
    id VARCHAR(36) PRIMARY KEY,
    organizacao_id VARCHAR(36) NOT NULL REFERENCES organizacoes(id) ON DELETE RESTRICT,
    tipo_estabelecimento VARCHAR(10) NOT NULL CHECK (tipo_estabelecimento IN ('MATRIZ', 'FILIAL')),
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(14) NOT NULL,
    inscricao_estadual VARCHAR(50),
    inscricao_municipal VARCHAR(50),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_estabelecimentos_org_cnpj UNIQUE (organizacao_id, cnpj)
);

-- 2. Tabela: socios_organizacao (Múltiplos sócios vinculados à organização - CA-2 / CA-4)
CREATE TABLE IF NOT EXISTS socios_organizacao (
    id VARCHAR(36) PRIMARY KEY,
    organizacao_id VARCHAR(36) NOT NULL REFERENCES organizacoes(id) ON DELETE RESTRICT,
    nome VARCHAR(255) NOT NULL,
    documento VARCHAR(14) NOT NULL,
    qualificacao VARCHAR(100) NOT NULL,
    percentual_participacao NUMERIC(5,2) NOT NULL CHECK (percentual_participacao > 0 AND percentual_participacao <= 100),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_socios_org_documento UNIQUE (organizacao_id, documento)
);

-- 3. Tabela: responsaveis_tecnicos (Múltiplos responsáveis técnicos vinculados à organização - CA-3 / CA-4)
CREATE TABLE IF NOT EXISTS responsaveis_tecnicos (
    id VARCHAR(36) PRIMARY KEY,
    organizacao_id VARCHAR(36) NOT NULL REFERENCES organizacoes(id) ON DELETE RESTRICT,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(11) NOT NULL,
    registro_profissional VARCHAR(50) NOT NULL,
    uf_registro CHAR(2) NOT NULL,
    qualificacao VARCHAR(100) NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_responsaveis_tecnicos_org_cpf UNIQUE (organizacao_id, cpf),
    CONSTRAINT uq_responsaveis_tecnicos_org_registro UNIQUE (organizacao_id, registro_profissional)
);
