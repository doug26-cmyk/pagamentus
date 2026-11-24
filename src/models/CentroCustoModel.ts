/**
 * Modelos de domínio para Centros de Custo, Departamentos, Projetos, Unidades e Comparativos
 * SPEC-2.6 (RF-014)
 */

export type TipoDimensaoGerencial =
  | 'CENTRO_CUSTO'
  | 'DEPARTAMENTO'
  | 'PROJETO'
  | 'UNIDADE';

/**
 * Representa uma dimensão gerencial (centro de custo, departamento, projeto ou unidade)
 * vinculada a uma empresa (CA-1)
 */
export interface CentroCustoDimensao {
  id: string;
  empresaId: string;
  codigo: string;
  nome: string;
  tipo: TipoDimensaoGerencial;
  ativo: boolean;
  criadoEm: Date;
}

/**
 * Item consolidado do relatório comparativo entre dois períodos para um centro de custo (CA-3)
 */
export interface ItemComparativoCentroCusto {
  centroCustoId: string;
  codigo: string;
  nome: string;
  tipo: TipoDimensaoGerencial | 'NAO_IDENTIFICADO';
  periodoBase: {
    competencia: string;
    totalDebitos: number;
    totalCreditos: number;
    saldoLiquido: number;
  };
  periodoComparado: {
    competencia: string;
    totalDebitos: number;
    totalCreditos: number;
    saldoLiquido: number;
  };
  variacaoAbsolutaDebitos: number;
  variacaoPercentualDebitos: number | null;
  variacaoAbsolutaSaldo: number;
}

/**
 * Resultado completo do comparativo entre dois períodos por centro de custo (CA-3)
 */
export interface RelatorioComparativoPeriodos {
  empresaId: string;
  periodoBase: string;
  periodoComparado: string;
  itens: ItemComparativoCentroCusto[];
}
