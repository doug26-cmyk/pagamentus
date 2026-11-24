-- ==============================================================================
-- Migração 009: Solicitações de Titulares e Registro de Incidentes LGPD (SPEC-1.11)
-- Requisito: RNF-002
-- ==============================================================================

-- 1. Tabela: solicitacoes_titulares_lgpd (Atendimento a pedidos dos titulares - CA-2 / CA-4)
CREATE TABLE IF NOT EXISTS solicitacoes_titulares_lgpd (
    id VARCHAR(36) PRIMARY KEY,
    protocolo VARCHAR(40) NOT NULL UNIQUE,
    organizacao_id VARCHAR(36) NOT NULL REFERENCES organizacoes(id) ON DELETE RESTRICT,
    titular_nome VARCHAR(255) NOT NULL,
    titular_contato VARCHAR(255) NOT NULL,
    tipo_direito VARCHAR(40) NOT NULL CHECK (
        tipo_direito IN (
            'CONFIRMACAO',
            'ACESSO',
            'CORRECAO',
            'ELIMINACAO',
            'ANONIMIZACAO',
            'PORTABILIDADE',
            'REVOGACAO_CONSENTIMENTO'
        )
    ),
    descricao TEXT NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'ABERTA' CHECK (
        status IN ('ABERTA', 'EM_ANALISE', 'ATENDIDA', 'INDEFERIDA_COM_JUSTIFICATIVA')
    ),
    justificativa_resposta TEXT,
    prazo_limite DATE NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    concluido_em TIMESTAMP WITH TIME ZONE
);

-- 2. Tabela: incidentes_privacidade_lgpd (Registro de incidentes de dados pessoais - CA-3 / CA-4)
CREATE TABLE IF NOT EXISTS incidentes_privacidade_lgpd (
    id VARCHAR(36) PRIMARY KEY,
    organizacao_id VARCHAR(36) NOT NULL REFERENCES organizacoes(id) ON DELETE RESTRICT,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    dados_afetados TEXT NOT NULL,
    severidade VARCHAR(20) NOT NULL CHECK (severidade IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
    medidas_adotadas TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ABERTO' CHECK (
        status IN ('ABERTO', 'EM_CONTENCAO', 'RESOLVIDO')
    ),
    registrado_por_usuario_id VARCHAR(36) NOT NULL,
    registrado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resolvido_em TIMESTAMP WITH TIME ZONE
);
