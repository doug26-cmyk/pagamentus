/**
 * Modelos de domínio para Conformidade LGPD: Solicitações de Titulares e Incidentes
 * SPEC-1.11 (RNF-002)
 */

export type TipoDireitoTitular =
  | 'CONFIRMACAO'
  | 'ACESSO'
  | 'CORRECAO'
  | 'ELIMINACAO'
  | 'ANONIMIZACAO'
  | 'PORTABILIDADE'
  | 'REVOGACAO_CONSENTIMENTO';

export type StatusSolicitacaoTitular =
  | 'ABERTA'
  | 'EM_ANALISE'
  | 'ATENDIDA'
  | 'INDEFERIDA_COM_JUSTIFICATIVA';

export type SeveridadeIncidenteLgpd = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type StatusIncidenteLgpd = 'ABERTO' | 'EM_CONTENCAO' | 'RESOLVIDO';

/**
 * Representa uma solicitação de titular de dados pessoais (Art. 18 LGPD / CA-2)
 */
export interface SolicitacaoTitularLgpd {
  id: string;
  protocolo: string;
  organizacaoId: string;
  titularNome: string;
  titularContato: string;
  tipoDireito: TipoDireitoTitular;
  descricao: string;
  status: StatusSolicitacaoTitular;
  justificativaResposta: string | null;
  prazoLimite: string; // YYYY-MM-DD (15 dias padrão)
  criadoEm: Date;
  concluidoEm: Date | null;
}

/**
 * Representa um incidente de segurança/privacidade envolvendo dados pessoais (CA-3)
 */
export interface IncidentePrivacidadeLgpd {
  id: string;
  organizacaoId: string;
  titulo: string;
  descricao: string;
  dadosAfetados: string;
  severidade: SeveridadeIncidenteLgpd;
  medidasAdotadas: string;
  status: StatusIncidenteLgpd;
  registradoPorUsuarioId: string;
  registradoEm: Date;
  resolvidoEm: Date | null;
}
