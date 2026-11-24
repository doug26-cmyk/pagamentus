import {
  EstabelecimentoOrganizacao,
  ResponsavelTecnicoOrganizacao,
  SocioOrganizacao,
} from '../models/EstabelecimentoSocioResponsavelModel';

/**
 * Contrato do repositório para Estabelecimentos, Filiais, Sócios e Responsáveis Técnicos (SPEC-1.7)
 */
export interface IEstabelecimentoSocioResponsavelRepository {
  // Estabelecimentos (Matriz e Filiais)
  salvarEstabelecimento(
    estabelecimento: EstabelecimentoOrganizacao
  ): Promise<EstabelecimentoOrganizacao>;
  buscarEstabelecimentoPorCnpj(
    organizacaoId: string,
    cnpj: string
  ): Promise<EstabelecimentoOrganizacao | null>;
  listarEstabelecimentosPorOrganizacao(
    organizacaoId: string
  ): Promise<EstabelecimentoOrganizacao[]>;

  // Sócios
  salvarSocio(socio: SocioOrganizacao): Promise<SocioOrganizacao>;
  buscarSocioPorDocumento(
    organizacaoId: string,
    documento: string
  ): Promise<SocioOrganizacao | null>;
  listarSociosPorOrganizacao(organizacaoId: string): Promise<SocioOrganizacao[]>;

  // Responsáveis Técnicos
  salvarResponsavelTecnico(
    responsavel: ResponsavelTecnicoOrganizacao
  ): Promise<ResponsavelTecnicoOrganizacao>;
  buscarResponsavelPorCpfOuRegistro(
    organizacaoId: string,
    cpf: string,
    registroProfissional: string
  ): Promise<ResponsavelTecnicoOrganizacao | null>;
  listarResponsaveisPorOrganizacao(
    organizacaoId: string
  ): Promise<ResponsavelTecnicoOrganizacao[]>;

  // Utilitário de limpeza para testes
  limpar(): Promise<void>;
}

/**
 * Implementação em memória do repositório de Estabelecimentos, Sócios e Responsáveis Técnicos
 */
export class InMemoryEstabelecimentoSocioResponsavelRepository
  implements IEstabelecimentoSocioResponsavelRepository
{
  private estabelecimentos: Map<string, EstabelecimentoOrganizacao> = new Map();
  private socios: Map<string, SocioOrganizacao> = new Map();
  private responsaveis: Map<string, ResponsavelTecnicoOrganizacao> = new Map();

  public async salvarEstabelecimento(
    estabelecimento: EstabelecimentoOrganizacao
  ): Promise<EstabelecimentoOrganizacao> {
    const copia: EstabelecimentoOrganizacao = { ...estabelecimento };
    this.estabelecimentos.set(copia.id, copia);
    return { ...copia };
  }

  public async buscarEstabelecimentoPorCnpj(
    organizacaoId: string,
    cnpj: string
  ): Promise<EstabelecimentoOrganizacao | null> {
    for (const item of this.estabelecimentos.values()) {
      if (item.organizacaoId === organizacaoId && item.cnpj === cnpj) {
        return { ...item };
      }
    }
    return null;
  }

  public async listarEstabelecimentosPorOrganizacao(
    organizacaoId: string
  ): Promise<EstabelecimentoOrganizacao[]> {
    return Array.from(this.estabelecimentos.values())
      .filter((e) => e.organizacaoId === organizacaoId)
      .map((e) => ({ ...e }));
  }

  public async salvarSocio(socio: SocioOrganizacao): Promise<SocioOrganizacao> {
    const copia: SocioOrganizacao = { ...socio };
    this.socios.set(copia.id, copia);
    return { ...copia };
  }

  public async buscarSocioPorDocumento(
    organizacaoId: string,
    documento: string
  ): Promise<SocioOrganizacao | null> {
    for (const item of this.socios.values()) {
      if (item.organizacaoId === organizacaoId && item.documento === documento) {
        return { ...item };
      }
    }
    return null;
  }

  public async listarSociosPorOrganizacao(organizacaoId: string): Promise<SocioOrganizacao[]> {
    return Array.from(this.socios.values())
      .filter((s) => s.organizacaoId === organizacaoId)
      .map((s) => ({ ...s }));
  }

  public async salvarResponsavelTecnico(
    responsavel: ResponsavelTecnicoOrganizacao
  ): Promise<ResponsavelTecnicoOrganizacao> {
    const copia: ResponsavelTecnicoOrganizacao = { ...responsavel };
    this.responsaveis.set(copia.id, copia);
    return { ...copia };
  }

  public async buscarResponsavelPorCpfOuRegistro(
    organizacaoId: string,
    cpf: string,
    registroProfissional: string
  ): Promise<ResponsavelTecnicoOrganizacao | null> {
    for (const item of this.responsaveis.values()) {
      if (
        item.organizacaoId === organizacaoId &&
        (item.cpf === cpf ||
          item.registroProfissional.toLowerCase() === registroProfissional.toLowerCase())
      ) {
        return { ...item };
      }
    }
    return null;
  }

  public async listarResponsaveisPorOrganizacao(
    organizacaoId: string
  ): Promise<ResponsavelTecnicoOrganizacao[]> {
    return Array.from(this.responsaveis.values())
      .filter((r) => r.organizacaoId === organizacaoId)
      .map((r) => ({ ...r }));
  }

  public async limpar(): Promise<void> {
    this.estabelecimentos.clear();
    this.socios.clear();
    this.responsaveis.clear();
  }
}
