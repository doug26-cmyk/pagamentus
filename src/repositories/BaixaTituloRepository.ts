import { BaixaTitulo } from '../models/BaixaTituloModel';

/**
 * Interface do repositório de Baixas de Títulos (SPEC-2.10)
 */
export interface IBaixaTituloRepository {
  salvar(baixa: BaixaTitulo): Promise<BaixaTitulo>;
  buscarPorId(id: string): Promise<BaixaTitulo | null>;
  listarPorParcela(
    empresaId: string,
    tituloId: string,
    numeroParcela: number
  ): Promise<BaixaTitulo[]>;
  listarPorEmpresa(empresaId: string): Promise<BaixaTitulo[]>;
  limpar(): Promise<void>;
}

/**
 * Repositório em memória para Baixas de Títulos
 */
export class InMemoryBaixaTituloRepository implements IBaixaTituloRepository {
  private baixas: Map<string, BaixaTitulo> = new Map();

  async salvar(baixa: BaixaTitulo): Promise<BaixaTitulo> {
    this.baixas.set(baixa.id, baixa);
    return baixa;
  }

  async buscarPorId(id: string): Promise<BaixaTitulo | null> {
    return this.baixas.get(id) || null;
  }

  async listarPorParcela(
    empresaId: string,
    tituloId: string,
    numeroParcela: number
  ): Promise<BaixaTitulo[]> {
    const lista: BaixaTitulo[] = [];
    for (const item of this.baixas.values()) {
      if (
        item.empresaId === empresaId &&
        item.tituloId === tituloId &&
        item.numeroParcela === numeroParcela
      ) {
        lista.push(item);
      }
    }
    return lista.sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
  }

  async listarPorEmpresa(empresaId: string): Promise<BaixaTitulo[]> {
    const lista: BaixaTitulo[] = [];
    for (const item of this.baixas.values()) {
      if (item.empresaId === empresaId) {
        lista.push(item);
      }
    }
    return lista;
  }

  async limpar(): Promise<void> {
    this.baixas.clear();
  }
}
