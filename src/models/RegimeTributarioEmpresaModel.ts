/**
 * Modelos de Domínio para Regimes Tributários por Empresa (SPEC-3.6 / RF-025, RF-026)
 */

export type EnquadramentoTributario =
  | 'SIMPLES_NACIONAL'
  | 'LUCRO_PRESUMIDO'
  | 'LUCRO_REAL'
  | 'MEI'
  | 'ISENTO_IMUNE'
  | 'OUTRO';

export interface SegregacaoReceita {
  categoria: string;
  percentual: number;
}

export interface OpcaoRegimeTributario {
  id: string;
  empresaId: string;
  regime: EnquadramentoTributario;
  vigenciaInicio: string; // YYYY-MM-DD
  vigenciaFim?: string; // YYYY-MM-DD (opcional quando vigente por prazo indeterminado)
  anexo?: string;
  faixa?: string;
  atividades: string[];
  segregacaoReceitas: SegregacaoReceita[];
  parametros: Record<string, string | number | boolean>;
  criadoEm: Date;
}

export interface RegistrarOpcaoRegimeDTO {
  empresaId: string;
  regime: EnquadramentoTributario;
  vigenciaInicio: string;
  vigenciaFim?: string;
  anexo?: string;
  faixa?: string;
  atividades?: string[];
  segregacaoReceitas?: SegregacaoReceita[];
  parametros?: Record<string, string | number | boolean>;
}
