/**
 * Modelos de Domínio para Conciliação Contábil e Bancária (SPEC-2.11 / RF-011, RF-048)
 */

export type StatusConciliacaoItem = 'PENDENTE' | 'SUGERIDA' | 'CONCILIADA';
export type TipoMovimentoExtrato = 'CREDITO' | 'DEBITO';
export type OrigemVinculoConciliacao =
  | 'LANCAMENTO'
  | 'BAIXA'
  | 'TITULO'
  | 'FOLHA'
  | 'FISCAL';

export interface SugestaoConciliacao {
  origemTipo: 'LANCAMENTO' | 'BAIXA';
  origemId: string;
  descricao: string;
  data: string;
  valor: number;
}

export interface VinculoConfirmadoConciliacao {
  origemTipo: OrigemVinculoConciliacao;
  origemId: string;
  confirmadoPor: string;
  confirmadoEm: Date;
}

export interface ItemExtratoBancario {
  id: string;
  extratoId: string;
  empresaId: string;
  data: string; // YYYY-MM-DD
  historico: string;
  tipo: TipoMovimentoExtrato;
  valor: number;
  status: StatusConciliacaoItem;
  sugestoes: SugestaoConciliacao[];
  vinculoConfirmado?: VinculoConfirmadoConciliacao;
}

export interface ExtratoBancario {
  id: string;
  empresaId: string;
  contaBancariaCodigo: string;
  contaContabilId?: string;
  saldoInicial: number;
  saldoFinal: number;
  itens: ItemExtratoBancario[];
  importadoEm: Date;
}

export interface ItemComparativoConciliacao {
  modulo:
    | 'BANCARIO'
    | 'CONTAS_PAGAR'
    | 'CONTAS_RECEBER'
    | 'FOLHA'
    | 'FISCAL';
  saldoContabil: number;
  saldoModulo: number;
  diferenca: number;
  conciliado: boolean;
}

export interface ResultadoConciliacaoSaldos {
  empresaId: string;
  competencia: string;
  comparativos: ItemComparativoConciliacao[];
  tudoConciliado: boolean;
}
