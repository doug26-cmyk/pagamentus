/**
 * Modelos de Domínio para Patrimônio e Estoque (SPEC-2.13 / RF-057, RF-058, RF-059, RF-060)
 */

export type TipoEncargoPatrimonial = 'DEPRECIACAO' | 'AMORTIZACAO' | 'EXAUSTAO';
export type StatusBemPatrimonial = 'ATIVO' | 'BAIXADO';

export interface PoliticaPatrimonial {
  metodo: 'LINEAR';
  permiteReavaliacao: boolean;
  taxaAnualFiscal?: number;
}

export interface RegistroEncargoPatrimonial {
  id: string;
  competencia: string; // YYYY-MM
  tipoEncargo: TipoEncargoPatrimonial;
  valorEncargo: number;
  acumuladoApos: number;
  valorContabilLiquidoApos: number;
  registradoEm: Date;
}

export interface EventoHistoricoPatrimonial {
  id: string;
  tipo: 'AQUISICAO' | 'ENCARGO' | 'TRANSFERENCIA' | 'REAVALIACAO' | 'BAIXA';
  data: string;
  descricao: string;
  documentoReferencia?: string;
  registradoEm: Date;
}

export interface BemPatrimonial {
  id: string;
  empresaId: string;
  codigo: string;
  descricao: string;
  tipoEncargo: TipoEncargoPatrimonial;
  localizacao: string;
  responsavel: string;
  dataAquisicao: string; // YYYY-MM-DD
  custoAquisicao: number;
  vidaUtilMeses: number;
  valorResidual: number;
  depreciacaoAcumulada: number;
  valorContabilLiquido: number;
  status: StatusBemPatrimonial;
  politica: PoliticaPatrimonial;
  encargos: RegistroEncargoPatrimonial[];
  historicoDocumental: EventoHistoricoPatrimonial[];
  criadoEm: Date;
}

export type TipoMovimentacaoEstoque =
  | 'SALDO_INICIAL'
  | 'ENTRADA'
  | 'SAIDA'
  | 'AJUSTE';

export interface MovimentacaoEstoque {
  id: string;
  empresaId: string;
  sku: string;
  descricao: string;
  data: string; // YYYY-MM-DD
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  valorUnitario: number;
  documentoReferencia?: string;
  importadoEm: Date;
}

export interface SaldoEstoqueItem {
  sku: string;
  descricao: string;
  quantidadeSaldo: number;
  valorTotalSaldo: number;
}
