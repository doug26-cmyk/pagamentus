/**
 * Modelos de Domínio para Notas Fiscais de Entrada, Saída e Serviços
 * com Retenções, Cancelamentos, Devoluções e Ajustes (SPEC-3.2 / RF-017)
 */

export type TipoNotaFiscal = 'ENTRADA' | 'SAIDA' | 'SERVICO';
export type StatusNotaFiscal = 'ATIVA' | 'CANCELADA' | 'DEVOLVIDA';

export interface RetencaoNotaFiscal {
  tributo: string;
  valor: number;
}

export interface CancelamentoNotaFiscal {
  data: string; // YYYY-MM-DD
  motivo: string;
  registradoEm: Date;
}

export interface DevolucaoNotaFiscal {
  id: string;
  data: string; // YYYY-MM-DD
  valorDevolvido: number;
  motivo: string;
  documentoReferencia?: string;
  registradoEm: Date;
}

export interface AjusteNotaFiscal {
  id: string;
  data: string; // YYYY-MM-DD
  tipo: 'ACRESCIMO' | 'REDUCAO';
  descricao: string;
  valor: number;
  registradoEm: Date;
}

export interface NotaFiscal {
  id: string;
  empresaId: string;
  tipo: TipoNotaFiscal;
  numero: string;
  serie: string;
  dataEmissao: string; // YYYY-MM-DD
  competencia: string; // YYYY-MM
  participanteNome: string;
  valorBruto: number;
  retencoes: RetencaoNotaFiscal[];
  totalRetencoes: number;
  valorLiquido: number;
  totalDevolvido: number;
  valorAjustes: number;
  status: StatusNotaFiscal;
  cancelamento?: CancelamentoNotaFiscal;
  devolucoes: DevolucaoNotaFiscal[];
  ajustes: AjusteNotaFiscal[];
  criadoEm: Date;
}
