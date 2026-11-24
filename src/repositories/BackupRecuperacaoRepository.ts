import {
  RegistroBackup,
  TesteRestauracaoBackup,
} from '../models/BackupRecuperacaoModel';

/**
 * Contrato do repositório para Backups Criptografados e Testes de Restauração (SPEC-1.12)
 */
export interface IBackupRecuperacaoRepository {
  salvarBackup(backup: RegistroBackup): Promise<RegistroBackup>;
  buscarBackupPorId(id: string): Promise<RegistroBackup | null>;
  listarBackupsPorOrganizacao(organizacaoId: string): Promise<RegistroBackup[]>;

  salvarTesteRestauracao(
    teste: TesteRestauracaoBackup
  ): Promise<TesteRestauracaoBackup>;
  listarTestesPorBackup(backupId: string): Promise<TesteRestauracaoBackup[]>;

  limpar(): Promise<void>;
}

/**
 * Implementação em memória do repositório de Backup e Restauração
 */
export class InMemoryBackupRecuperacaoRepository
  implements IBackupRecuperacaoRepository
{
  private backups: Map<string, RegistroBackup> = new Map();
  private testes: Map<string, TesteRestauracaoBackup> = new Map();

  public async salvarBackup(backup: RegistroBackup): Promise<RegistroBackup> {
    const copia: RegistroBackup = { ...backup };
    this.backups.set(copia.id, copia);
    return { ...copia };
  }

  public async buscarBackupPorId(id: string): Promise<RegistroBackup | null> {
    const item = this.backups.get(id);
    return item ? { ...item } : null;
  }

  public async listarBackupsPorOrganizacao(
    organizacaoId: string
  ): Promise<RegistroBackup[]> {
    return Array.from(this.backups.values())
      .filter((b) => b.organizacaoId === organizacaoId)
      .map((b) => ({ ...b }));
  }

  public async salvarTesteRestauracao(
    teste: TesteRestauracaoBackup
  ): Promise<TesteRestauracaoBackup> {
    const copia: TesteRestauracaoBackup = { ...teste };
    this.testes.set(copia.id, copia);
    return { ...copia };
  }

  public async listarTestesPorBackup(
    backupId: string
  ): Promise<TesteRestauracaoBackup[]> {
    return Array.from(this.testes.values())
      .filter((t) => t.backupId === backupId)
      .map((t) => ({ ...t }));
  }

  public async limpar(): Promise<void> {
    this.backups.clear();
    this.testes.clear();
  }
}
