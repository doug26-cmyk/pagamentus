import { NotaFiscal } from '../models/NotaFiscalModel';

/**
 * Interface do repositório de Notas Fiscais (SPEC-3.2)
 */
export interface INotaFiscalRepository {
  salvar(nota: NotaFiscal): Promise<NotaFiscal>;
  buscarPorId(id: string): Promise<NotaFiscal | null>;
  listarPorEmpresa(empresaId: string): Promise<NotaFiscal[]>;
  limpar(): Promise<void>;
}

/**
 * Repositório em memória para Notas Fiscais
 */
export class InMemoryNotaFiscalRepository implements INotaFiscalRepository {
  private notas: Map<string, NotaFiscal> = new Map();

  async salvar(nota: NotaFiscal): Promise<NotaFiscal> {
    this.notas.set(nota.id, nota);
    return nota;
  }

  async buscarPorId(id: string): Promise<NotaFiscal | null> {
    return this.notas.get(id) || null;
  }

  async listarPorEmpresa(empresaId: string): Promise<NotaFiscal[]> {
    const lista: NotaFiscal[] = [];
    for (const nota of this.notas.values()) {
      if (nota.empresaId === empresaId) {
        lista.push(nota);
      }
    }
    return lista.sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
  }

  async limpar(): Promise<void> {
    this.notas.clear();
  }
}
