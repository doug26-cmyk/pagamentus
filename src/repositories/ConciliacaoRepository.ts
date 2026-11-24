import { ExtratoBancario, ItemExtratoBancario } from '../models/ConciliacaoModel';

/**
 * Interface do repositório de Conciliação Bancária (SPEC-2.11)
 */
export interface IConciliacaoRepository {
  salvarExtrato(extrato: ExtratoBancario): Promise<ExtratoBancario>;
  listarExtratosPorEmpresa(empresaId: string): Promise<ExtratoBancario[]>;
  buscarItemPorId(itemId: string): Promise<ItemExtratoBancario | null>;
  atualizarItem(item: ItemExtratoBancario): Promise<ItemExtratoBancario>;
  limpar(): Promise<void>;
}

/**
 * Repositório em memória para Extratos e Itens de Conciliação
 */
export class InMemoryConciliacaoRepository implements IConciliacaoRepository {
  private extratos: Map<string, ExtratoBancario> = new Map();

  async salvarExtrato(extrato: ExtratoBancario): Promise<ExtratoBancario> {
    this.extratos.set(extrato.id, extrato);
    return extrato;
  }

  async listarExtratosPorEmpresa(empresaId: string): Promise<ExtratoBancario[]> {
    const lista: ExtratoBancario[] = [];
    for (const ext of this.extratos.values()) {
      if (ext.empresaId === empresaId) {
        lista.push(ext);
      }
    }
    return lista.sort(
      (a, b) => a.importadoEm.getTime() - b.importadoEm.getTime()
    );
  }

  async buscarItemPorId(itemId: string): Promise<ItemExtratoBancario | null> {
    for (const ext of this.extratos.values()) {
      const encontrado = ext.itens.find((i) => i.id === itemId);
      if (encontrado) return encontrado;
    }
    return null;
  }

  async atualizarItem(
    item: ItemExtratoBancario
  ): Promise<ItemExtratoBancario> {
    const extrato = this.extratos.get(item.extratoId);
    if (extrato) {
      const idx = extrato.itens.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        extrato.itens[idx] = item;
      }
    }
    return item;
  }

  async limpar(): Promise<void> {
    this.extratos.clear();
  }
}
