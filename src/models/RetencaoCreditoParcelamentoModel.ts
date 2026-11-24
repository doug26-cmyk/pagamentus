/**
 * Modelos de Domínio para Retenções, Créditos, Compensações, Parcelamentos e Vencimentos
 * (SPEC-3.8 / RF-022)
 */

export type TipoRetencao = 'RETIDO' | 'SOFRIDO';

export type StatusParcela = 'ABERTA' | 'PAGA' | 'ATRASADA';

export interface RetencaoTributaria {
  id: string;
  empresaId: string;
  tipo: TipoRetencao;
  tributo: string;
  competencia: string; // YYYY-MM
  dataVencimento: string; // YYYY-MM-DD
  valor: number;
  documentoReferencia?: string;
  criadoEm: Date;
}

export interface CreditoTributario {
  id: string;
  empresaId: string;
  tributo: string;
  origem: string;
  dataApuracao: string; // YYYY-MM-DD
  valorInicial: number;
  saldoDisponivel: number;
  criadoEm: Date;
}

export interface CompensacaoTributaria {
  id: string;
  empresaId: string;
  creditoId: string;
  tributoDestino: string;
  valorCompensado: number;
  dataCompensacao: string; // YYYY-MM-DD
  criadoEm: Date;
}

export interface ParcelaParcelamento {
  numero: number;
  dataVencimento: string; // YYYY-MM-DD
  valor: number;
  status: StatusParcela;
  dataPagamento?: string;
}

export interface ParcelamentoTributario {
  id: string;
  empresaId: string;
  tributo: string;
  valorTotal: number;
  quantidadeParcelas: number;
  parcelas: ParcelaParcelamento[];
  criadoEm: Date;
}

export interface ItemVencimentoTributario {
  origem: 'RETENCAO' | 'PARCELAMENTO';
  referenciaId: string;
  tributo: string;
  dataVencimento: string;
  valor: number;
  status: 'ABERTO' | 'ATRASADO';
  detalhe: string;
}
