import { NaturezaConta } from './ContaContabil';
import { TipoPartida } from './LancamentoContabil';

/**
 * Linha de uma conta no Balancete de Verificação (SPEC-2.7 / RF-013)
 */
export interface ItemBalanceteConta {
  contaId: string;
  codigo: string;
  nome: string;
  natureza: NaturezaConta;
  saldoAnterior: number;
  totalDebitos: number;
  totalCreditos: number;
  saldoFinal: number;
}

/**
 * Estrutura do Balancete de Verificação por competência (CA-1)
 */
export interface BalanceteVerificacao {
  empresaId: string;
  competencia: string;
  contas: ItemBalanceteConta[];
  totalDebitos: number;
  totalCreditos: number;
}

/**
 * Movimento individual de uma conta no Livro Razão (CA-2)
 */
export interface MovimentoLivroRazao {
  lancamentoId: string;
  dataLancamento: string;
  competencia: string;
  historico: string;
  documentoOrigem: string;
  tipoPartida: TipoPartida;
  debito: number;
  credito: number;
  saldoAcumulado: number;
}

/**
 * Estrutura do Livro Razão de uma conta em uma competência (CA-2)
 */
export interface LivroRazao {
  empresaId: string;
  competencia: string;
  conta: {
    id: string;
    codigo: string;
    nome: string;
    natureza: NaturezaConta;
  };
  saldoAnterior: number;
  movimentos: MovimentoLivroRazao[];
  totalDebitos: number;
  totalCreditos: number;
  saldoFinal: number;
}

/**
 * Partida detalhada no Livro Diário (CA-3)
 */
export interface PartidaLivroDiario {
  contaId: string;
  codigoConta: string;
  nomeConta: string;
  tipo: TipoPartida;
  valor: number;
  centroCustoId?: string;
}

/**
 * Lançamento cronológico no Livro Diário (CA-3)
 */
export interface LancamentoLivroDiario {
  lancamentoId: string;
  dataLancamento: string;
  competencia: string;
  historico: string;
  documentoOrigem: string;
  valorTotal: number;
  partidas: PartidaLivroDiario[];
}

/**
 * Estrutura do Livro Diário por competência (CA-3)
 */
export interface LivroDiario {
  empresaId: string;
  competencia: string;
  lancamentos: LancamentoLivroDiario[];
  totalDebitos: number;
  totalCreditos: number;
}

/**
 * Item consolidado do livro/relatório auxiliar de movimentação por conta (CA-4)
 */
export interface ItemRelatorioAuxiliar {
  contaId: string;
  codigoConta: string;
  nomeConta: string;
  quantidadePartidas: number;
  totalDebitos: number;
  totalCreditos: number;
  saldoMovimento: number;
}

/**
 * Estrutura do livro/relatório auxiliar por competência (CA-4)
 */
export interface RelatorioAuxiliarContabil {
  empresaId: string;
  competencia: string;
  itens: ItemRelatorioAuxiliar[];
  totalDebitos: number;
  totalCreditos: number;
}
