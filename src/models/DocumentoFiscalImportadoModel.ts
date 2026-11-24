/**
 * Modelos de Domínio para Importação de Documentos Fiscais (SPEC-3.1 / RF-016)
 */

export type TipoDocumentoFiscal =
  | 'NFE'
  | 'NFSE'
  | 'CTE'
  | 'NFCE'
  | 'ARQUIVO_FISCAL';

export interface DocumentoFiscalImportado {
  id: string;
  empresaId: string;
  nomeArquivo: string;
  tipoDocumento: TipoDocumentoFiscal;
  sistemaAutorizadoOrigem: string;
  chaveAcesso?: string;
  conteudoOriginal: string;
  tamanhoBytes: number;
  hashSha256: string;
  importadoEm: Date;
}

export interface ResultadoVerificacaoIntegridade {
  documentoId: string;
  empresaId: string;
  hashArmazenado: string;
  hashRecalculado: string;
  hashEsperadoInformado?: string;
  integro: boolean;
}
