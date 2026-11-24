-- ==============================================================================
-- Migração 010: Backup Criptografado e Testes de Restauração (SPEC-1.12)
-- Requisitos: RNF-008 e RNF-016
-- ==============================================================================

-- 1. Tabela: registros_backup (Backups automáticos criptografados - CA-1)
CREATE TABLE IF NOT EXISTS registros_backup (
    id VARCHAR(36) PRIMARY KEY,
    organizacao_id VARCHAR(36) NOT NULL REFERENCES organizacoes(id) ON DELETE RESTRICT,
    origem_tipo VARCHAR(30) NOT NULL CHECK (origem_tipo IN ('AUTOMATICO', 'MANUAL')),
    conteudo_cifrado TEXT NOT NULL, -- Criptografado com AES-256-GCM
    hash_sha256 VARCHAR(64) NOT NULL,
    tamanho_bytes INTEGER NOT NULL CHECK (tamanho_bytes > 0),
    rpo_horas INTEGER NOT NULL DEFAULT 24,
    rto_horas INTEGER NOT NULL DEFAULT 4,
    status VARCHAR(20) NOT NULL CHECK (status IN ('CONCLUIDO', 'FALHA')),
    executado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Tabela: testes_restauracao_backup (Registro periódico de testes de restauração - CA-2 / CA-3)
CREATE TABLE IF NOT EXISTS testes_restauracao_backup (
    id VARCHAR(36) PRIMARY KEY,
    backup_id VARCHAR(36) NOT NULL REFERENCES registros_backup(id) ON DELETE CASCADE,
    status_teste VARCHAR(20) NOT NULL CHECK (status_teste IN ('APROVADO', 'FALHA')),
    integridade_verificada BOOLEAN NOT NULL,
    tempo_execucao_ms INTEGER NOT NULL CHECK (tempo_execucao_ms >= 0),
    detalhes TEXT NOT NULL,
    testado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
