/**
 * Modelos de domínio para Backup Automático Criptografado e Teste de Restauração
 * SPEC-1.12 (RNF-008 e RNF-016)
 */

export type OrigemBackup = 'AUTOMATICO' | 'MANUAL';
export type StatusBackup = 'CONCLUIDO' | 'FALHA';
export type StatusTesteRestauracao = 'APROVADO' | 'FALHA';

/**
 * Representa um backup armazenado de forma criptografada com metadados de RPO/RTO (CA-1)
 */
export interface RegistroBackup {
  id: string;
  organizacaoId: string;
  origemTipo: OrigemBackup;
  conteudoCifrado: string;
  hashSha256: string;
  tamanhoBytes: number;
  rpoHoras: number;
  rtoHoras: number;
  status: StatusBackup;
  executadoEm: Date;
}

/**
 * Representa o registro formal de um teste periódico de restauração de backup (CA-2 e CA-3)
 */
export interface TesteRestauracaoBackup {
  id: string;
  backupId: string;
  statusTeste: StatusTesteRestauracao;
  integridadeVerificada: boolean;
  tempoExecucaoMs: number;
  detalhes: string;
  testadoEm: Date;
}

/**
 * Resultado retornado pela execução do teste de restauração
 */
export interface ResultadoTesteRestauracao {
  testeRegistrado: TesteRestauracaoBackup;
  dadosRestaurados: string | null;
}
