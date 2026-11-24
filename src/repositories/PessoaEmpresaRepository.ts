import {
  DadosFiscaisVigencia,
  PessoaEmpresa,
} from '../models/PessoaEmpresaModel';

/**
 * Contrato do repositório para Cadastro de Pessoas (PF), Empresas (PJ) e Dados Fiscais (SPEC-1.6)
 */
export interface IPessoaEmpresaRepository {
  // Pessoas e Empresas (RF-001)
  salvarPessoaEmpresa(entidade: PessoaEmpresa): Promise<PessoaEmpresa>;
  buscarPessoaEmpresaPorId(id: string): Promise<PessoaEmpresa | null>;
  buscarPorOrganizacaoEDocumento(
    organizacaoId: string,
    documento: string
  ): Promise<PessoaEmpresa | null>;
  listarPorOrganizacao(organizacaoId: string): Promise<PessoaEmpresa[]>;

  // Dados Fiscais com Vigência (RF-002)
  salvarDadosFiscais(dadosFiscais: DadosFiscaisVigencia): Promise<DadosFiscaisVigencia>;
  listarDadosFiscaisPorPessoaEmpresa(
    pessoaEmpresaId: string
  ): Promise<DadosFiscaisVigencia[]>;

  // Utilitário de limpeza para testes
  limpar(): Promise<void>;
}

/**
 * Implementação em memória do repositório de Pessoas, Empresas e Dados Fiscais
 */
export class InMemoryPessoaEmpresaRepository implements IPessoaEmpresaRepository {
  private pessoasEmpresas: Map<string, PessoaEmpresa> = new Map();
  private dadosFiscais: Map<string, DadosFiscaisVigencia> = new Map();

  public async salvarPessoaEmpresa(entidade: PessoaEmpresa): Promise<PessoaEmpresa> {
    const copia: PessoaEmpresa = {
      ...entidade,
      contatos: entidade.contatos.map((c) => ({ ...c })),
      enderecos: entidade.enderecos.map((e) => ({ ...e })),
      responsaveis: entidade.responsaveis.map((r) => ({ ...r })),
    };
    this.pessoasEmpresas.set(copia.id, copia);
    return { ...copia };
  }

  public async buscarPessoaEmpresaPorId(id: string): Promise<PessoaEmpresa | null> {
    const item = this.pessoasEmpresas.get(id);
    if (!item) {
      return null;
    }
    return {
      ...item,
      contatos: item.contatos.map((c) => ({ ...c })),
      enderecos: item.enderecos.map((e) => ({ ...e })),
      responsaveis: item.responsaveis.map((r) => ({ ...r })),
    };
  }

  public async buscarPorOrganizacaoEDocumento(
    organizacaoId: string,
    documento: string
  ): Promise<PessoaEmpresa | null> {
    for (const item of this.pessoasEmpresas.values()) {
      if (item.organizacaoId === organizacaoId && item.documento === documento) {
        return { ...item };
      }
    }
    return null;
  }

  public async listarPorOrganizacao(organizacaoId: string): Promise<PessoaEmpresa[]> {
    return Array.from(this.pessoasEmpresas.values())
      .filter((item) => item.organizacaoId === organizacaoId)
      .map((item) => ({ ...item }));
  }

  public async salvarDadosFiscais(
    dados: DadosFiscaisVigencia
  ): Promise<DadosFiscaisVigencia> {
    const copia: DadosFiscaisVigencia = {
      ...dados,
      enquadramentos: [...dados.enquadramentos],
    };
    this.dadosFiscais.set(copia.id, copia);
    return { ...copia, enquadramentos: [...copia.enquadramentos] };
  }

  public async listarDadosFiscaisPorPessoaEmpresa(
    pessoaEmpresaId: string
  ): Promise<DadosFiscaisVigencia[]> {
    return Array.from(this.dadosFiscais.values())
      .filter((d) => d.pessoaEmpresaId === pessoaEmpresaId)
      .map((d) => ({ ...d, enquadramentos: [...d.enquadramentos] }));
  }

  public async limpar(): Promise<void> {
    this.pessoasEmpresas.clear();
    this.dadosFiscais.clear();
  }
}
