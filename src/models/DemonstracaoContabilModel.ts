/**
 * Linha de conta consolidada em demonstrações contábeis (SPEC-2.8 / RF-013)
 */
export interface ContaSaldoDemonstracao {
  contaId: string;
  codigo: string;
  nome: string;
  saldo: number;
}

/**
 * Balanço Patrimonial por competência (CA-1)
 */
export interface BalancoPatrimonial {
  empresaId: string;
  competencia: string;
  ativo: {
    contas: ContaSaldoDemonstracao[];
    total: number;
  };
  passivo: {
    contas: ContaSaldoDemonstracao[];
    total: number;
  };
  patrimonioLiquido: {
    contas: ContaSaldoDemonstracao[];
    resultadoExercicio: number;
    totalSemResultado: number;
    totalAjustado: number;
  };
  totalAtivo: number;
  totalPassivoEPatrimonioLiquido: number;
  equacaoPatrimonialFechada: boolean;
}

/**
 * Demonstração do Resultado do Exercício - DRE (CA-2)
 */
export interface DemonstracaoResultadoExercicio {
  empresaId: string;
  competencia: string;
  receitas: {
    contas: ContaSaldoDemonstracao[];
    total: number;
  };
  despesas: {
    contas: ContaSaldoDemonstracao[];
    total: number;
  };
  resultadoLiquido: number;
}

/**
 * Movimento de entrada ou saída na DFC (CA-3)
 */
export interface MovimentoFluxoCaixa {
  lancamentoId: string;
  dataLancamento: string;
  historico: string;
  contaCaixaCodigo: string;
  contaCaixaNome: string;
  tipo: 'ENTRADA' | 'SAIDA';
  valor: number;
}

/**
 * Demonstração dos Fluxos de Caixa - DFC (CA-3)
 */
export interface DemonstracaoFluxosCaixa {
  empresaId: string;
  competencia: string;
  aplicavel: boolean;
  motivoNaoAplicavel?: string;
  saldoInicial: number;
  entradas: number;
  saidas: number;
  variacaoLiquida: number;
  saldoFinal: number;
  movimentos: MovimentoFluxoCaixa[];
}

/**
 * Demonstração das Mutações do Patrimônio Líquido / DLPA (CA-3)
 */
export interface DemonstracaoMutacoesPL {
  empresaId: string;
  competencia: string;
  aplicavel: boolean;
  motivoNaoAplicavel?: string;
  saldoInicial: number;
  mutacoesNoPeriodo: number;
  resultadoPeriodo: number;
  saldoFinal: number;
  contas: ContaSaldoDemonstracao[];
}
