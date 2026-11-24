/**
 * Modelos de Domínio para Classificação das Operações (SPEC-3.4 / RF-019)
 */

export type RegimeTributario =
  | 'SIMPLES_NACIONAL'
  | 'LUCRO_PRESUMIDO'
  | 'LUCRO_REAL';

export type TipoOperacaoFiscal = 'ENTRADA' | 'SAIDA' | 'SERVICO';

export interface RegraClassificacaoOperacao {
  id: string;
  empresaId: string;
  regime: RegimeTributario;
  tipoOperacao: TipoOperacaoFiscal;
  natureza: string;
  ncmPrefixo: string; // Prefixo de 1 a 8 dígitos (ou NCM completo de 8 dígitos)
  cfop: string;
  cstCsosn: string;
  tabelaFicticia: true;
  criadoEm: Date;
}

export interface ClassificacaoOperacao {
  id: string;
  empresaId: string;
  regime: RegimeTributario;
  tipoOperacao: TipoOperacaoFiscal;
  natureza: string;
  ncm: string;
  cfop: string;
  cstCsosn: string;
  regraAplicadaId: string;
  avisoTabelaFicticia: string;
  classificadoEm: Date;
}
