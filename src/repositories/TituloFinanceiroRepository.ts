import { TituloFinanceiro } from '../models/TituloFinanceiroModel';

/**
 * Interface do repositório de Títulos a Pagar e a Receber (SPEC-2.9)
 */
export interface ITituloFinanceiroRepository {
  salvar(titulo: TituloFinanceiro): Promise<TituloFinanceiro>;
  buscarPorId(id: string): Promise<TituloFinanceiro | null>;
  listarPorEmpresa(empresaId: string): Promise<TituloFinanceiro[]>;
  limpar(): Promise<void>;
}

/**
 * Repositório em memória para Títulos Financeiros
 */
export class InMemoryTituloFinanceiroRepository
  implements ITituloFinanceiroRepository
{
  private titulos: Map<string, TituloFinanceiro> = new Map();

  async salvar(titulo: TituloFinanceiro): Promise<TituloFinanceiro> {
    this.titulos.set(titulo.id, titulo);
    return titulo;
  }

  async buscarPorId(id: string): Promise<TituloFinanceiro | null> {
    return this.titulos.get(id) || null;
  }

  async listarPorEmpresa(empresaId: string): Promise<TituloFinanceiro[]> {
    const lista: TituloFinanceiro[] = [];
    for (const item of this.titulos.values()) {
      if (item.empresaId === empresaId) {
        lista.push(item);
      }
    }
    return lista.sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
  }

  async limpar(): Promise<void> {
    this.titulos.clear();
  }
}
