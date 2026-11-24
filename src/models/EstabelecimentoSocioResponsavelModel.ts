/**
 * Modelos de domínio para Estabelecimentos (Matriz e Filiais), Sócios e Responsáveis Técnicos
 * SPEC-1.7 (RF-005)
 */

export type TipoEstabelecimento = 'MATRIZ' | 'FILIAL';

/**
 * Representa um estabelecimento (Matriz ou Filial) vinculado a uma organização (CA-1)
 */
export interface EstabelecimentoOrganizacao {
  id: string;
  organizacaoId: string;
  tipoEstabelecimento: TipoEstabelecimento;
  nome: string;
  cnpj: string;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  criadoEm: Date;
}

/**
 * Representa um sócio vinculado a uma organização (CA-2)
 */
export interface SocioOrganizacao {
  id: string;
  organizacaoId: string;
  nome: string;
  documento: string;
  qualificacao: string;
  percentualParticipacao: number;
  criadoEm: Date;
}

/**
 * Representa um responsável técnico vinculado a uma organização (CA-3)
 */
export interface ResponsavelTecnicoOrganizacao {
  id: string;
  organizacaoId: string;
  nome: string;
  cpf: string;
  registroProfissional: string;
  ufRegistro: string;
  qualificacao: string;
  criadoEm: Date;
}

/**
 * Visão consolidada da estrutura de estabelecimentos, sócios e responsáveis técnicos de uma organização
 */
export interface EstruturaOrganizacaoConsolidada {
  organizacaoId: string;
  estabelecimentos: EstabelecimentoOrganizacao[];
  socios: SocioOrganizacao[];
  responsaveisTecnicos: ResponsavelTecnicoOrganizacao[];
}
