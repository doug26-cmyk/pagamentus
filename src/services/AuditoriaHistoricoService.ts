import * as crypto from 'crypto';
import {
  LogAuditoriaHistorico,
  OperacaoAuditoria,
  ResultadoAuditoria,
} from '../models/AuditoriaHistoricoModel';
import { IAuditoriaHistoricoRepository } from '../repositories/AuditoriaHistoricoRepository';

const OPERACOES_AUDITORIA_PERMITIDAS: OperacaoAuditoria[] = [
  'INCLUSAO',
  'ALTERACAO',
  'EXCLUSAO_LOGICA',
  'ESTORNO',
  'APROVACAO',
];

/**
 * Serviço de Trilha de Auditoria e Histórico Cadastral Imutável
 * Implementa a SPEC-1.9 (RF-015, RF-004, RNF-004 e RB-007)
 */
export class AuditoriaHistoricoService {
  constructor(private readonly repo: IAuditoriaHistoricoRepository) {}

  /**
   * Calcula o hash SHA-256 de integridade do registro de auditoria (RNF-004)
   */
  public calcularHashIntegridade(dados: {
    organizacaoId: string;
    usuarioId: string;
    dataHoraIso: string;
    objetoTipo: string;
    objetoId: string;
    operacao: OperacaoAuditoria;
    resultado: ResultadoAuditoria;
    justificativa: string;
    dadosAnteriores: Record<string, any> | null;
    dadosNovos: Record<string, any> | null;
  }): string {
    const conteudo = JSON.stringify(dados);
    return crypto.createHash('sha256').update(conteudo).digest('hex');
  }

  /**
   * Registra um evento na trilha de auditoria e no histórico cadastral (CA-1, CA-2 e CA-4):
   * - Exige usuário responsável, objeto, operação e justificativa
   * - Preserva estados anterior e novo para rastreabilidade de correções, exclusões lógicas e estornos
   */
  public async registrarEvento(dados: {
    id?: string;
    organizacaoId: string;
    usuarioId: string;
    objetoTipo: string;
    objetoId: string;
    operacao: OperacaoAuditoria;
    resultado?: ResultadoAuditoria;
    justificativa: string;
    dadosAnteriores?: Record<string, any> | null;
    dadosNovos?: Record<string, any> | null;
  }): Promise<LogAuditoriaHistorico> {
    const organizacaoId = (dados.organizacaoId || '').trim();
    if (!organizacaoId) {
      throw new Error('O identificador da organização é obrigatório.');
    }

    const usuarioId = (dados.usuarioId || '').trim();
    if (!usuarioId) {
      throw new Error('O usuário responsável pela operação é obrigatório (RF-004 / RNF-004).');
    }

    const objetoTipo = (dados.objetoTipo || '').trim();
    const objetoId = (dados.objetoId || '').trim();
    if (!objetoTipo || !objetoId) {
      throw new Error('O tipo e o identificador do objeto auditado são obrigatórios.');
    }

    if (!OPERACOES_AUDITORIA_PERMITIDAS.includes(dados.operacao)) {
      throw new Error(
        `Operação inválida. Valores permitidos: ${OPERACOES_AUDITORIA_PERMITIDAS.join(', ')}.`
      );
    }

    const justificativa = (dados.justificativa || '').trim();
    if (!justificativa) {
      throw new Error(
        'A justificativa da operação é obrigatória para registro de auditoria e histórico (RF-004 / RB-007).'
      );
    }

    const dataHora = new Date();
    const resultado: ResultadoAuditoria = dados.resultado || 'SUCESSO';
    const dadosAnteriores = dados.dadosAnteriores ?? null;
    const dadosNovos = dados.dadosNovos ?? null;

    const hashIntegridade = this.calcularHashIntegridade({
      organizacaoId,
      usuarioId,
      dataHoraIso: dataHora.toISOString(),
      objetoTipo,
      objetoId,
      operacao: dados.operacao,
      resultado,
      justificativa,
      dadosAnteriores,
      dadosNovos,
    });

    const novoLog: LogAuditoriaHistorico = {
      id: dados.id || crypto.randomUUID(),
      organizacaoId,
      usuarioId,
      dataHora,
      objetoTipo,
      objetoId,
      operacao: dados.operacao,
      resultado,
      justificativa,
      dadosAnteriores,
      dadosNovos,
      hashIntegridade,
    };

    return this.repo.inserirLog(novoLog);
  }

  /**
   * Consulta a trilha de auditoria filtrada por organização ou operação (CA-1)
   */
  public async listarLogs(filtros?: {
    organizacaoId?: string;
    operacao?: OperacaoAuditoria;
  }): Promise<LogAuditoriaHistorico[]> {
    let logs = filtros?.organizacaoId
      ? await this.repo.listarPorOrganizacao(filtros.organizacaoId)
      : await this.repo.listarTodos();

    if (filtros?.operacao) {
      logs = logs.filter((l) => l.operacao === filtros.operacao);
    }

    return logs;
  }

  /**
   * Consulta o histórico completo de alterações, exclusões lógicas e estornos de um objeto (CA-2)
   */
  public async obterHistoricoObjeto(objetoId: string): Promise<LogAuditoriaHistorico[]> {
    if (!objetoId || !objetoId.trim()) {
      throw new Error('O identificador do objeto é obrigatório.');
    }
    return this.repo.listarPorObjetoId(objetoId.trim());
  }

  /**
   * Bloqueia qualquer tentativa de edição de um log de auditoria existente (CA-3 / RNF-004)
   */
  public async editarLog(
    id: string,
    dadosParciais: Partial<LogAuditoriaHistorico>
  ): Promise<never> {
    return this.repo.atualizarLog(id, dadosParciais);
  }

  /**
   * Bloqueia qualquer tentativa de exclusão de um log de auditoria existente (CA-3 / RNF-004 / RB-007)
   */
  public async excluirLog(id: string): Promise<never> {
    return this.repo.excluirLog(id);
  }
}
