import * as crypto from 'crypto';
import {
  OrigemBackup,
  RegistroBackup,
  ResultadoTesteRestauracao,
  TesteRestauracaoBackup,
} from '../models/BackupRecuperacaoModel';
import { IBackupRecuperacaoRepository } from '../repositories/BackupRecuperacaoRepository';
import { CriptografiaSegurancaService } from './CriptografiaSegurancaService';

/**
 * Serviço de Backup Automático Criptografado e Testes Periódicos de Restauração
 * Implementa a SPEC-1.12 (RNF-008 e RNF-016)
 */
export class BackupRecuperacaoService {
  private readonly rpoPadraoHoras = 24;
  private readonly rtoPadraoHoras = 4;

  constructor(
    private readonly repo: IBackupRecuperacaoRepository,
    private readonly criptoService: CriptografiaSegurancaService
  ) {}

  /**
   * Calcula o hash SHA-256 de uma string de dados
   */
  public calcularSha256(conteudo: string): string {
    return crypto.createHash('sha256').update(conteudo, 'utf8').digest('hex');
  }

  // ============================================================================
  // CA-1: Execução de Backup Automático Criptografado (RNF-008)
  // ============================================================================

  /**
   * Executa um backup criptografando o conteúdo com AES-256-GCM e registrando
   * hash SHA-256 de integridade e metas de RPO/RTO (CA-1)
   */
  public async executarBackup(dados: {
    id?: string;
    organizacaoId: string;
    origemTipo?: OrigemBackup;
    conteudoJson: Record<string, any> | string;
    rpoHoras?: number;
    rtoHoras?: number;
  }): Promise<RegistroBackup> {
    const organizacaoId = (dados.organizacaoId || '').trim();
    if (!organizacaoId) {
      throw new Error('O identificador da organização é obrigatório.');
    }

    const origemTipo: OrigemBackup = dados.origemTipo || 'AUTOMATICO';
    if (origemTipo !== 'AUTOMATICO' && origemTipo !== 'MANUAL') {
      throw new Error("Origem de backup inválida. Use 'AUTOMATICO' ou 'MANUAL'.");
    }

    const conteudoSerializado =
      typeof dados.conteudoJson === 'string'
        ? dados.conteudoJson
        : JSON.stringify(dados.conteudoJson);

    if (!conteudoSerializado || conteudoSerializado.trim().length === 0) {
      throw new Error('O conteúdo para backup não pode ser vazio.');
    }

    // 1. Calcula hash SHA-256 do conteúdo original antes da cifragem
    const hashSha256 = this.calcularSha256(conteudoSerializado);

    // 2. Criptografa o conteúdo com AES-256-GCM utilizando chave de variável de ambiente
    const conteudoCifrado = this.criptoService.cifrarDadoSensivel(conteudoSerializado);

    const novoBackup: RegistroBackup = {
      id: dados.id || crypto.randomUUID(),
      organizacaoId,
      origemTipo,
      conteudoCifrado,
      hashSha256,
      tamanhoBytes: Buffer.byteLength(conteudoSerializado, 'utf8'),
      rpoHoras: dados.rpoHoras ?? this.rpoPadraoHoras,
      rtoHoras: dados.rtoHoras ?? this.rtoPadraoHoras,
      status: 'CONCLUIDO',
      executadoEm: new Date(),
    };

    return this.repo.salvarBackup(novoBackup);
  }

  /**
   * Lista os backups registrados de uma organização
   */
  public async listarBackups(organizacaoId: string): Promise<RegistroBackup[]> {
    return this.repo.listarBackupsPorOrganizacao(organizacaoId);
  }

  // ============================================================================
  // CA-2 e CA-3: Teste Periódico de Restauração e Detecção de Corrupção
  // ============================================================================

  /**
   * Executa um teste de restauração sobre um backup criptografado existente:
   * - Decifra o backup e valida a integridade via SHA-256
   * - Registra o resultado formal (APROVADO ou FALHA) com tempo de execução (CA-2 e CA-3)
   */
  public async testarRestauracao(backupId: string): Promise<ResultadoTesteRestauracao> {
    const backup = await this.repo.buscarBackupPorId(backupId);
    if (!backup) {
      throw new Error('Backup não encontrado.');
    }

    const inicioMs = Date.now();
    let dadosRestaurados: string | null = null;
    let integridadeVerificada = false;
    let statusTeste: 'APROVADO' | 'FALHA' = 'FALHA';
    let detalhes = '';

    try {
      // 1. Tenta decifrar o pacote de backup
      const decifrado = this.criptoService.decifrarDadoSensivel(backup.conteudoCifrado);

      // 2. Recalcula o hash SHA-256 e compara com o hash original do backup
      const hashRestaurado = this.calcularSha256(decifrado);
      if (hashRestaurado !== backup.hashSha256) {
        detalhes =
          'Falha de integridade: hash SHA-256 dos dados restaurados diverge do registro original.';
      } else {
        integridadeVerificada = true;
        statusTeste = 'APROVADO';
        dadosRestaurados = decifrado;
        detalhes = `Restauração validada com sucesso dentro do RTO configurado (${backup.rtoHoras}h).`;
      }
    } catch (erro: any) {
      detalhes = `Falha ao decifrar ou validar backup corrompido/adulterado: ${erro.message}`;
    }

    const tempoExecucaoMs = Math.max(0, Date.now() - inicioMs);

    const testeRegistrado: TesteRestauracaoBackup = {
      id: crypto.randomUUID(),
      backupId: backup.id,
      statusTeste,
      integridadeVerificada,
      tempoExecucaoMs,
      detalhes,
      testadoEm: new Date(),
    };

    await this.repo.salvarTesteRestauracao(testeRegistrado);

    return {
      testeRegistrado,
      dadosRestaurados,
    };
  }

  /**
   * Lista os testes de restauração registrados para um backup (CA-2 e CA-3)
   */
  public async listarTestesRestauracao(
    backupId: string
  ): Promise<TesteRestauracaoBackup[]> {
    return this.repo.listarTestesPorBackup(backupId);
  }
}
