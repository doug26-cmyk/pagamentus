import { LogAuditoriaHistorico } from '../models/AuditoriaHistoricoModel';

/**
 * Contrato do repositório Append-Only para Auditoria e Histórico Cadastral (SPEC-1.9)
 */
export interface IAuditoriaHistoricoRepository {
  inserirLog(log: LogAuditoriaHistorico): Promise<LogAuditoriaHistorico>;
  buscarLogPorId(id: string): Promise<LogAuditoriaHistorico | null>;
  listarPorObjetoId(objetoId: string): Promise<LogAuditoriaHistorico[]>;
  listarPorOrganizacao(organizacaoId: string): Promise<LogAuditoriaHistorico[]>;
  listarTodos(): Promise<LogAuditoriaHistorico[]>;
  atualizarLog(id: string, dadosParciais: Partial<LogAuditoriaHistorico>): Promise<never>;
  excluirLog(id: string): Promise<never>;
  limparParaTeste(): Promise<void>;
}

/**
 * Implementação em memória Append-Only com congelamento de objetos (Object.freeze)
 * para impedir qualquer alteração indevida em logs já gravados (RNF-004 / CA-3)
 */
export class InMemoryAuditoriaHistoricoRepository implements IAuditoriaHistoricoRepository {
  private logs: LogAuditoriaHistorico[] = [];

  private clonarImutavel(log: LogAuditoriaHistorico): LogAuditoriaHistorico {
    const copia: LogAuditoriaHistorico = {
      ...log,
      dataHora: new Date(log.dataHora.getTime()),
      dadosAnteriores: log.dadosAnteriores
        ? Object.freeze(JSON.parse(JSON.stringify(log.dadosAnteriores)))
        : null,
      dadosNovos: log.dadosNovos
        ? Object.freeze(JSON.parse(JSON.stringify(log.dadosNovos)))
        : null,
    };
    return Object.freeze(copia);
  }

  public async inserirLog(log: LogAuditoriaHistorico): Promise<LogAuditoriaHistorico> {
    // Impede sobrescrita de log existente (append-only estrito - CA-3)
    const jaExiste = this.logs.some((item) => item.id === log.id);
    if (jaExiste) {
      throw new Error(
        'Operação bloqueada: um log de auditoria existente não pode ser sobrescrito ou editado (RNF-004).'
      );
    }

    const imutavel = this.clonarImutavel(log);
    this.logs.push(imutavel);
    return imutavel;
  }

  public async buscarLogPorId(id: string): Promise<LogAuditoriaHistorico | null> {
    const encontrado = this.logs.find((item) => item.id === id);
    return encontrado ? this.clonarImutavel(encontrado) : null;
  }

  public async listarPorObjetoId(objetoId: string): Promise<LogAuditoriaHistorico[]> {
    return this.logs
      .filter((item) => item.objetoId === objetoId)
      .map((item) => this.clonarImutavel(item));
  }

  public async listarPorOrganizacao(organizacaoId: string): Promise<LogAuditoriaHistorico[]> {
    return this.logs
      .filter((item) => item.organizacaoId === organizacaoId)
      .map((item) => this.clonarImutavel(item));
  }

  public async listarTodos(): Promise<LogAuditoriaHistorico[]> {
    return this.logs.map((item) => this.clonarImutavel(item));
  }

  public async atualizarLog(
    _id: string,
    _dadosParciais: Partial<LogAuditoriaHistorico>
  ): Promise<never> {
    throw new Error(
      'Operação bloqueada: logs de auditoria e histórico cadastral são imutáveis e não permitem edição (RNF-004 / RB-007).'
    );
  }

  public async excluirLog(_id: string): Promise<never> {
    throw new Error(
      'Operação bloqueada: logs de auditoria e histórico cadastral são imutáveis e não permitem exclusão (RNF-004 / RB-007).'
    );
  }

  public async limparParaTeste(): Promise<void> {
    this.logs = [];
  }
}
