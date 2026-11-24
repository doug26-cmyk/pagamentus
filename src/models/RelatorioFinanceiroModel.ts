/**
 * Modelos de Domínio para Fluxo de Caixa e Relatórios Financeiros (SPEC-2.12 / RF-049)
 */

export type FaixaAging =
  | 'A_VENCER'
  | '1_30_DIAS'
  | '31_60_DIAS'
  | '61_90_DIAS'
  | 'ACIMA_90_DIAS';

export interface FluxoCaixaFinanceiro {
  empresaId: string;
  dataInicio: string;
  dataFim: string;
  realizado: {
    entradas: number;
    saidas: number;
    saldoLiquido: number;
  };
  previsto: {
    entradas: number;
    saidas: number;
    saldoLiquido: number;
  };
  saldoTotalProjetado: number;
}

export interface PosicaoFinanceira {
  empresaId: string;
  dataReferencia: string;
  totalAReceberEmAberto: number;
  totalAPagarEmAberto: number;
  saldoProjetado: number;
  totalRecebido: number;
  totalPago: number;
  saldoRealizado: number;
}

export interface ItemFaixaAging {
  faixa: FaixaAging;
  quantidadeParcelas: number;
  valorTotal: number;
}

export interface AgingRecebiveis {
  empresaId: string;
  dataReferencia: string;
  faixas: ItemFaixaAging[];
  totalEmAberto: number;
}

export interface ItemPrevisaoPagamento {
  tituloId: string;
  fornecedorNome: string;
  categoria: string;
  centroCustoId?: string;
  numeroParcela: number;
  vencimento: string;
  valorOriginal: number;
  saldoEmAberto: number;
}

export interface PrevisaoPagamentos {
  empresaId: string;
  dataInicio: string;
  dataFim: string;
  centroCustoId?: string;
  itens: ItemPrevisaoPagamento[];
  totalPrevisto: number;
}

export interface ItemRelatorioFinanceiroCentroCusto {
  centroCustoId: string;
  codigo: string;
  nome: string;
  totalPagar: number;
  totalReceber: number;
  totalPago: number;
  totalRecebido: number;
  abertoPagar: number;
  abertoReceber: number;
  saldoLiquidoEmAberto: number;
  saldoLiquidoRealizado: number;
}

export interface RelatorioFinanceiroCentroCusto {
  empresaId: string;
  itens: ItemRelatorioFinanceiroCentroCusto[];
  totalAbertoPagar: number;
  totalAbertoReceber: number;
}
