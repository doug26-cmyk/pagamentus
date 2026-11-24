import { AnexoCadastral } from '../models/AnexoCadastralModel';

/**
 * Contrato do repositório para Anexos Cadastrais com controle de validade (SPEC-1.8)
 */
export interface IAnexoCadastralRepository {
  salvarAnexo(anexo: AnexoCadastral): Promise<AnexoCadastral>;
  buscarAnexoPorId(id: string): Promise<AnexoCadastral | null>;
  listarPorPessoaEmpresa(pessoaEmpresaId: string): Promise<AnexoCadastral[]>;
  listarPorOrganizacao(organizacaoId: string): Promise<AnexoCadastral[]>;
  listarTodos(): Promise<AnexoCadastral[]>;
  limpar(): Promise<void>;
}

/**
 * Implementação em memória do repositório de Anexos Cadastrais
 */
export class InMemoryAnexoCadastralRepository implements IAnexoCadastralRepository {
  private anexos: Map<string, AnexoCadastral> = new Map();

  public async salvarAnexo(anexo: AnexoCadastral): Promise<AnexoCadastral> {
    const copia: AnexoCadastral = { ...anexo };
    this.anexos.set(copia.id, copia);
    return { ...copia };
  }

  public async buscarAnexoPorId(id: string): Promise<AnexoCadastral | null> {
    const item = this.anexos.get(id);
    return item ? { ...item } : null;
  }

  public async listarPorPessoaEmpresa(pessoaEmpresaId: string): Promise<AnexoCadastral[]> {
    return Array.from(this.anexos.values())
      .filter((a) => a.pessoaEmpresaId === pessoaEmpresaId)
      .map((a) => ({ ...a }));
  }

  public async listarPorOrganizacao(organizacaoId: string): Promise<AnexoCadastral[]> {
    return Array.from(this.anexos.values())
      .filter((a) => a.organizacaoId === organizacaoId)
      .map((a) => ({ ...a }));
  }

  public async listarTodos(): Promise<AnexoCadastral[]> {
    return Array.from(this.anexos.values()).map((a) => ({ ...a }));
  }

  public async limpar(): Promise<void> {
    this.anexos.clear();
  }
}
