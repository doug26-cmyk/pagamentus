import {
  BemPatrimonial,
  MovimentacaoEstoque,
} from '../models/PatrimonioEstoqueModel';

/**
 * Interface do repositório de Patrimônio e Estoque (SPEC-2.13)
 */
export interface IPatrimonioEstoqueRepository {
  salvarBem(bem: BemPatrimonial): Promise<BemPatrimonial>;
  buscarBemPorId(id: string): Promise<BemPatrimonial | null>;
  listarBensPorEmpresa(empresaId: string): Promise<BemPatrimonial[]>;
  salvarMovimentacoesEstoque(
    itens: MovimentacaoEstoque[]
  ): Promise<MovimentacaoEstoque[]>;
  listarMovimentacoesEstoque(empresaId: string): Promise<MovimentacaoEstoque[]>;
  limpar(): Promise<void>;
}

/**
 * Repositório em memória para Patrimônio e Estoque
 */
export class InMemoryPatrimonioEstoqueRepository
  implements IPatrimonioEstoqueRepository
{
  private bens: Map<string, BemPatrimonial> = new Map();
  private movimentacoes: MovimentacaoEstoque[] = [];

  async salvarBem(bem: BemPatrimonial): Promise<BemPatrimonial> {
    this.bens.set(bem.id, bem);
    return bem;
  }

  async buscarBemPorId(id: string): Promise<BemPatrimonial | null> {
    return this.bens.get(id) || null;
  }

  async listarBensPorEmpresa(empresaId: string): Promise<BemPatrimonial[]> {
    const lista: BemPatrimonial[] = [];
    for (const bem of this.bens.values()) {
      if (bem.empresaId === empresaId) {
        lista.push(bem);
      }
    }
    return lista.sort((a, b) => a.codigo.localeCompare(b.codigo));
  }

  async salvarMovimentacoesEstoque(
    itens: MovimentacaoEstoque[]
  ): Promise<MovimentacaoEstoque[]> {
    this.movimentacoes.push(...itens);
    return itens;
  }

  async listarMovimentacoesEstoque(
    empresaId: string
  ): Promise<MovimentacaoEstoque[]> {
    return this.movimentacoes.filter((m) => m.empresaId === empresaId);
  }

  async limpar(): Promise<void> {
    this.bens.clear();
    this.movimentacoes = [];
  }
}
