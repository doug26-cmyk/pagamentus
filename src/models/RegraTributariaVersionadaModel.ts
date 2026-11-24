import { RegimeTributario } from './ClassificacaoOperacaoModel';

/**
 * Modelos de Domínio para Regras Tributárias Versionadas (SPEC-3.5 / RF-080, RB-004)
 */

export type SituacaoContribuinte = 'REGULAR' | 'ISENTO' | 'SUSPENSO' | 'IMUNE';

export interface RegraTributariaVersionada {
  id: string;
  empresaId: string;
  codigoRegra: string;
  versao: number;
  exercicio: number;
  vigenciaInicio: string; // YYYY-MM-DD
  vigenciaFim: string; // YYYY-MM-DD
  regime: RegimeTributario;
  jurisdicao: string;
  situacaoContribuinte: SituacaoContribuinte;
  aliquotaPercentual: number;
  parcelaDeduzir: number;
  leiauteVersao: string;
  tabelaFicticia: true;
  criadoEm: Date;
}

export interface ResultadoCalculoTributario {
  empresaId: string;
  codigoRegra: string;
  versaoUtilizada: number;
  exercicio: number;
  dataCalculo: string;
  regime: RegimeTributario;
  jurisdicao: string;
  situacaoContribuinte: SituacaoContribuinte;
  baseCalculo: number;
  aliquotaPercentual: number;
  parcelaDeduzir: number;
  valorImposto: number;
  leiauteVersao: string;
  avisoRegraParametrizada: string;
}
