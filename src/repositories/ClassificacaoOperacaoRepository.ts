import {
  ClassificacaoOperacao,
  RegraClassificacaoOperacao,
} from '../models/ClassificacaoOperacaoModel';

/**
 * Interface do repositório de Classificação das Operações (SPEC-3.4)
 */
export interface IClassificacaoOperacaoRepository {
  salvarRegra(
    regra: RegraClassificacaoOperacao
  ): Promise<RegraClassificacaoOperacao>;
  listarRegrasPorEmpresa(
    empresaId: string
  ): Promise<RegraClassificacaoOperacao[]>;
  salvarClassificacao(
    item: ClassificacaoOperacao
  ): Promise<ClassificacaoOperacao>;
  listarClassificacoesPorEmpresa(
    empresaId: string
  ): Promise<ClassificacaoOperacao[]>;
  limpar(): Promise<void>;
}

/**
 * Repositório em memória para Classificação das Operações
 */
export class InMemoryClassificacaoOperacaoRepository
  implements IClassificacaoOperacaoRepository
{
  private regras: Map<string, RegraClassificacaoOperacao> = new Map();
  private classificacoes: ClassificacaoOperacao[] = [];

  async salvarRegra(
    regra: RegraClassificacaoOperacao
  ): Promise<RegraClassificacaoOperacao> {
    this.regras.set(regra.id, regra);
    return regra;
  }

  async listarRegrasPorEmpresa(
    empresaId: string
  ): Promise<RegraClassificacaoOperacao[]> {
    const lista: RegraClassificacaoOperacao[] = [];
    for (const r of this.regras.values()) {
      if (r.empresaId === empresaId) {
        lista.push(r);
      }
    }
    return lista.sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
  }

  async salvarClassificacao(
    item: ClassificacaoOperacao
  ): Promise<ClassificacaoOperacao> {
    this.classificacoes.push(item);
    return item;
  }

  async listarClassificacoesPorEmpresa(
    empresaId: string
  ): Promise<ClassificacaoOperacao[]> {
    return this.classificacoes.filter((c) => c.empresaId === empresaId);
  }

  async limpar(): Promise<void> {
    this.regras.clear();
    this.classificacoes = [];
  }
}
