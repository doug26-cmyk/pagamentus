/**
 * Modelos de domínio para Anexos Cadastrais e Controle de Validade
 * SPEC-1.8 (RF-003)
 */

export type TipoAnexoCadastral =
  | 'CONTRATO_SOCIAL'
  | 'PROCURACAO'
  | 'DOCUMENTO_CADASTRAL'
  | 'CERTIFICADO'
  | 'OUTRO';

export type StatusValidadeAnexo = 'VIGENTE' | 'A_VENCER' | 'VENCIDO' | 'SEM_VALIDADE';

/**
 * Representa um documento/arquivo anexado a um cadastro (RF-003 / CA-1)
 */
export interface AnexoCadastral {
  id: string;
  organizacaoId: string;
  pessoaEmpresaId: string;
  tipoAnexo: TipoAnexoCadastral;
  nomeArquivo: string;
  mimeType: string;
  tamanhoBytes: number;
  caminhoOuHashArquivo: string;
  dataEmissao: string | null; // YYYY-MM-DD
  dataValidade: string | null; // YYYY-MM-DD
  criadoEm: Date;
}

/**
 * Representa o anexo enriquecido com a avaliação de validade em relação à data de referência
 */
export interface AnexoCadastralComStatus extends AnexoCadastral {
  statusValidade: StatusValidadeAnexo;
  diasParaVencimento: number | null;
  alertaMensagem: string | null;
}
