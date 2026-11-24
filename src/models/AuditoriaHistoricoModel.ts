/**
 * Modelos de domínio para Trilha de Auditoria e Histórico Cadastral Imutável
 * SPEC-1.9 (RF-015, RF-004, RNF-004 e RB-007)
 */

export type OperacaoAuditoria =
  | 'INCLUSAO'
  | 'ALTERACAO'
  | 'EXCLUSAO_LOGICA'
  | 'ESTORNO'
  | 'APROVACAO';

export type ResultadoAuditoria = 'SUCESSO' | 'FALHA';

/**
 * Representa um registro imutável na trilha de auditoria e histórico cadastral (CA-1, CA-2, CA-3)
 */
export interface LogAuditoriaHistorico {
  readonly id: string;
  readonly organizacaoId: string;
  readonly usuarioId: string;
  readonly dataHora: Date;
  readonly objetoTipo: string;
  readonly objetoId: string;
  readonly operacao: OperacaoAuditoria;
  readonly resultado: ResultadoAuditoria;
  readonly justificativa: string;
  readonly dadosAnteriores: Record<string, any> | null;
  readonly dadosNovos: Record<string, any> | null;
  readonly hashIntegridade: string;
}
