-- ==============================================================================
-- Migração 002: Autenticação, Senhas Fortes, MFA e Sessões Ativas (SPEC-1.4)
-- Requisitos: RF-075 e RNF-003
-- ==============================================================================

-- 1. Evolução da tabela perfis: indicador de perfil privilegiado (exige MFA obrigatório - CA-2)
ALTER TABLE perfis
ADD COLUMN IF NOT EXISTS privilegiado BOOLEAN DEFAULT FALSE NOT NULL;

-- 2. Evolução da tabela usuarios: suporte a MFA e bloqueio por tentativas (CA-2 e CA-3)
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS mfa_habilitado BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS mfa_segredo VARCHAR(100),
ADD COLUMN IF NOT EXISTS tentativas_falhas INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS bloqueado_ate TIMESTAMP WITH TIME ZONE;

-- 3. Tabela: sessoes (Controle e encerramento de sessões ativas - CA-4 e RF-075)
CREATE TABLE IF NOT EXISTS sessoes (
    id VARCHAR(36) PRIMARY KEY,
    usuario_id VARCHAR(36) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    ativa BOOLEAN DEFAULT TRUE NOT NULL,
    requer_mfa BOOLEAN DEFAULT FALSE NOT NULL,
    mfa_verificado BOOLEAN DEFAULT FALSE NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    encerrado_em TIMESTAMP WITH TIME ZONE
);
