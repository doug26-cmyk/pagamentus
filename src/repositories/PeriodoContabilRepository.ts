import * as crypto from 'crypto';
import { IPeriodoContabil, StatusPeriodoContabil } from '../models/LancamentoContabil';

/**
 * Interface do repositório para controle de Períodos Contábeis (RF-008, RF-012, RB-002)
 */
export interface IPeriodoContabilRepository {
  obterStatus(empresaId: string, competencia: string): Promise<StatusPeriodoContabil>;
  definirStatus(
    empresaId: string,
    competencia: string,
    status: StatusPeriodoContabil,
    metadados?: { usuarioId?: string; justificativa?: string }
  ): Promise<void>;
  obterPeriodo(empresaId: string, competencia: string): Promise<IPeriodoContabil>;
  listarPorEmpresa(empresaId: string): Promise<IPeriodoContabil[]>;
  limpar(): Promise<void>;
}

/**
 * Implementação em memória de períodos contábeis suportando ABERTO, EM_FECHAMENTO e ENCERRADO
 */
export class InMemoryPeriodoContabilRepository implements IPeriodoContabilRepository {
  // Chave: `${empresaId}:${competencia}` -> Registro completo do período
  private periodos: Map<string, IPeriodoContabil> = new Map();

  private gerarChave(empresaId: string, competencia: string): string {
    return `${empresaId}:${competencia}`;
  }

  public async obterStatus(
    empresaId: string,
    competencia: string
  ): Promise<StatusPeriodoContabil> {
    const registro = this.periodos.get(this.gerarChave(empresaId, competencia));
    // Por padrão de negócio contábil, se não estiver expressamente registrado, inicia ABERTO
    return registro ? registro.status : 'ABERTO';
  }

  public async definirStatus(
    empresaId: string,
    competencia: string,
    status: StatusPeriodoContabil,
    metadados?: { usuarioId?: string; justificativa?: string }
  ): Promise<void> {
    const chave = this.gerarChave(empresaId, competencia);
    const existente = this.periodos.get(chave);

    const atualizado: IPeriodoContabil = {
      id: existente?.id || crypto.randomUUID(),
      empresaId,
      competencia,
      status,
      atualizadoEm: new Date(),
      ultimoUsuarioId: metadados?.usuarioId,
      justificativaUltimaAlteracao: metadados?.justificativa,
    };

    this.periodos.set(chave, atualizado);
  }

  public async obterPeriodo(
    empresaId: string,
    competencia: string
  ): Promise<IPeriodoContabil> {
    const chave = this.gerarChave(empresaId, competencia);
    const existente = this.periodos.get(chave);
    if (existente) {
      return { ...existente };
    }

    const novo: IPeriodoContabil = {
      id: crypto.randomUUID(),
      empresaId,
      competencia,
      status: 'ABERTO',
      atualizadoEm: new Date(),
    };
    this.periodos.set(chave, novo);
    return { ...novo };
  }

  public async listarPorEmpresa(empresaId: string): Promise<IPeriodoContabil[]> {
    return Array.from(this.periodos.values())
      .filter((p) => p.empresaId === empresaId)
      .map((p) => ({ ...p }));
  }

  public async limpar(): Promise<void> {
    this.periodos.clear();
  }
}
