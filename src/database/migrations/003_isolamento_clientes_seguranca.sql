-- ==============================================================================
-- Migração 003: Perfis, Permissões, Isolamento entre Clientes e Segurança (SPEC-1.5)
-- Requisitos: RB-008 e RNF-001
-- ==============================================================================

-- 1. Tabela: autorizacoes_clientes
-- Registra autorizações expressas (procurações) para que um usuário possa acessar
-- dados de outro cliente/organização de forma controlada e rastreável (RB-008 / CA-2)
CREATE TABLE IF NOT EXISTS autorizacoes_clientes (
    id VARCHAR(36) PRIMARY KEY,
    usuario_id VARCHAR(36) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    cliente_id VARCHAR(36) NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
    concedido_por_usuario_id VARCHAR(36) NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    ativa BOOLEAN DEFAULT TRUE NOT NULL,
    expira_em TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_autorizacao_usuario_cliente UNIQUE (usuario_id, cliente_id)
);

-- 2. Tabela: registros_clientes
-- Armazena dados vinculados estritamente a um cliente/organização com dados sensíveis
-- criptografados em repouso (RNF-001 / RB-008 / CA-1 / CA-4)
CREATE TABLE IF NOT EXISTS registros_clientes (
    id VARCHAR(36) PRIMARY KEY,
    cliente_id VARCHAR(36) NOT NULL REFERENCES organizacoes(id) ON DELETE RESTRICT,
    titulo VARCHAR(255) NOT NULL,
    dado_sensivel_cifrado TEXT NOT NULL, -- Criptografado com AES-256-GCM antes de persistir
    criado_por_usuario_id VARCHAR(36) NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_registros_clientes_cliente_id ON registros_clientes(cliente_id);
