import { EnquadramentoTributario } from './RegimeTributarioEmpresaModel';

/**
 * Modelos de Domínio para Cálculo e Memória de Cálculo Tributário
 * (SPEC-3.7 / RF-020, RF-021, RF-027, RNF-012)
 */

export type EsferaTributaria = 'FEDERAL' | 'ESTADUAL' | 'MUNICIPAL';

export type TipoOperacaoTributaria = 'VENDA' | 'SERVICO' | 'COMPRA' | 'OUTRA';

export interface RegraCalculoTributario {
  id: string;
  empresaId: string;
  tributo: string;
  esfera: EsferaTributaria;
  versao: number;
  regime: EnquadramentoTributario;
  atividade: string;
  uf: string;
  municipio: string;
  tipoOperacao: TipoOperacaoTributaria;
  vigenciaInicio: string; // YYYY-MM-DD
  vigenciaFim: string; // YYYY-MM-DD
  aliquotaPercentual: number;
  tabelaFicticia: true;
  criadoEm: Date;
}

export interface CadastrarRegraCalculoDTO {
  empresaId: string;
  tributo: string;
  esfera: EsferaTributaria;
  regime: EnquadramentoTributario;
  atividade: string;
  uf: string;
  municipio: string;
  tipoOperacao: TipoOperacaoTributaria;
  vigenciaInicio: string;
  vigenciaFim: string;
  aliquotaPercentual: number;
}

export interface EntradaCalculoTributario {
  regime: EnquadramentoTributario;
  atividade: string;
  uf: string;
  municipio: string;
  dataOperacao: string; // YYYY-MM-DD
  tipoOperacao: TipoOperacaoTributaria;
  valorOperacao: number;
  deducoes?: number;
  retencoes?: number;
  creditos?: number;
}

export interface MemoriaCalculoTributo {
  tributo: string;
  esfera: EsferaTributaria;
  regraId: string;
  versaoRegra: number;
  baseCalculoBruta: number;
  deducoes: number;
  baseCalculoTributavel: number;
  aliquotaPercentual: number;
  valorBrutoCalculado: number;
  retencoes: number;
  creditos: number;
  valorFinalTributo: number;
  regraArredondamento: string;
  formulaAplicada: string;
}

export interface ResultadoCalculoMemoria {
  id: string;
  empresaId: string;
  dataOperacao: string;
  regime: EnquadramentoTributario;
  atividade: string;
  uf: string;
  municipio: string;
  tipoOperacao: TipoOperacaoTributaria;
  valorOperacao: number;
  totalTributos: number;
  memorias: MemoriaCalculoTributo[];
  avisoRegraParametrizada: string;
  calculadoEm: Date;
}
