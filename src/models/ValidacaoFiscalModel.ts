/**
 * Modelos de Domínio para Validação Fiscal e Duplicidades (SPEC-3.3 / RF-018)
 */

export interface RegraValidacaoFiscal {
  empresaId: string;
  exigirCoerenciaDataCompetencia: boolean;
  bloquearDuplicidade: boolean;
  cfopsPermitidos: string[];
  cstsPermitidos: string[];
  valorMaximoPermitido?: number;
  atualizadoEm: Date;
}

export interface DocumentoParaValidacaoFiscal {
  tipo: 'ENTRADA' | 'SAIDA' | 'SERVICO';
  numero: string;
  serie?: string;
  chaveAcesso?: string;
  dataEmissao: string; // YYYY-MM-DD
  competencia: string; // YYYY-MM
  valorTotal: number;
  participanteNome: string;
  participanteDocumento: string;
  cfop: string;
  cst: string;
}

export interface MotivoRejeicaoFiscal {
  campo: string;
  codigoRegra: string;
  motivo: string;
}

export interface ResultadoValidacaoFiscal {
  empresaId: string;
  valido: boolean;
  motivos: MotivoRejeicaoFiscal[];
}
