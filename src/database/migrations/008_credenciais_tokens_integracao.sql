-- ==============================================================================
-- Migração 008: Credenciais Protegidas e Tokens de Integração com Escopo Mínimo (SPEC-1.10)
-- Requisito: RF-076
-- ==============================================================================

-- 1. Tabela: credenciais_integracao (Credenciais armazenadas criptografadas - CA-1)
CREATE TABLE IF NOT EXISTS credenciais_integracao (
    id VARCHAR(36) PRIMARY KEY,
    organizacao_id VARCHAR(36) NOT NULL REFERENCES organizacoes(id) ON DELETE RESTRICT,
    nome_integracao VARCHAR(150) NOT NULL,
    provedor VARCHAR(100) NOT NULL,
    credencial_secreta_cifrada TEXT NOT NULL, -- Cifrada com AES-256-GCM
    credencial_mascarada VARCHAR(50) NOT NULL,
    escopos_permitidos JSONB NOT NULL DEFAULT '[]',
    ativa BOOLEAN DEFAULT TRUE NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    rotacionado_em TIMESTAMP WITH TIME ZONE
);

-- 2. Tabela: tokens_integracao (Tokens com escopo mínimo, rotação e revogação - CA-2, CA-3, CA-4)
CREATE TABLE IF NOT EXISTS tokens_integracao (
    id VARCHAR(36) PRIMARY KEY,
    organizacao_id VARCHAR(36) NOT NULL REFERENCES organizacoes(id) ON DELETE RESTRICT,
    credencial_id VARCHAR(36) NOT NULL REFERENCES credenciais_integracao(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- Hash SHA-256 do token
    prefixo_visivel VARCHAR(24) NOT NULL,
    escopos JSONB NOT NULL,
    ativo BOOLEAN DEFAULT TRUE NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    revogado_em TIMESTAMP WITH TIME ZONE,
    substituido_por_token_id VARCHAR(36)
);

CREATE INDEX IF NOT EXISTS idx_tokens_integracao_hash ON tokens_integracao(token_hash);
