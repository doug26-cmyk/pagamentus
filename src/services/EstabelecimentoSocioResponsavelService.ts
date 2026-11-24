import * as crypto from 'crypto';
import {
  EstabelecimentoOrganizacao,
  EstruturaOrganizacaoConsolidada,
  ResponsavelTecnicoOrganizacao,
  SocioOrganizacao,
  TipoEstabelecimento,
} from '../models/EstabelecimentoSocioResponsavelModel';
import { IEstabelecimentoSocioResponsavelRepository } from '../repositories/EstabelecimentoSocioResponsavelRepository';

/**
 * Serviço para gestão de múltiplos Estabelecimentos (Matriz e Filiais), Sócios e Responsáveis Técnicos
 * vinculados à mesma organização (SPEC-1.7 / RF-005)
 */
export class EstabelecimentoSocioResponsavelService {
  constructor(private readonly repo: IEstabelecimentoSocioResponsavelRepository) {}

  private limparDigitos(valor: string): string {
    return (valor || '').replace(/\D/g, '');
  }

  // ============================================================================
  // CA-1 e CA-4: Múltiplos Estabelecimentos e Filiais vinculados à Organização
  // ============================================================================

  /**
   * Cadastra um estabelecimento (Matriz ou Filial) vinculado a uma organização (RF-005 / CA-1 / CA-4)
   */
  public async cadastrarEstabelecimento(dados: {
    id?: string;
    organizacaoId: string;
    tipoEstabelecimento: TipoEstabelecimento;
    nome: string;
    cnpj: string;
    inscricaoEstadual?: string | null;
    inscricaoMunicipal?: string | null;
  }): Promise<EstabelecimentoOrganizacao> {
    const organizacaoId = (dados.organizacaoId || '').trim();
    if (!organizacaoId) {
      throw new Error('O identificador da organização é obrigatório.');
    }

    if (dados.tipoEstabelecimento !== 'MATRIZ' && dados.tipoEstabelecimento !== 'FILIAL') {
      throw new Error("O tipo de estabelecimento deve ser 'MATRIZ' ou 'FILIAL'.");
    }

    if (!dados.nome || !dados.nome.trim()) {
      throw new Error('O nome do estabelecimento é obrigatório.');
    }

    const cnpjLimpo = this.limparDigitos(dados.cnpj);
    if (cnpjLimpo.length !== 14) {
      throw new Error('O CNPJ do estabelecimento deve conter 14 dígitos numéricos.');
    }

    // Impede duplicidade de CNPJ do estabelecimento dentro da mesma organização (CA-4)
    const existente = await this.repo.buscarEstabelecimentoPorCnpj(organizacaoId, cnpjLimpo);
    if (existente) {
      throw new Error(
        `Já existe um estabelecimento com o CNPJ '${cnpjLimpo}' vinculado a esta organização.`
      );
    }

    const novoEstabelecimento: EstabelecimentoOrganizacao = {
      id: dados.id || crypto.randomUUID(),
      organizacaoId,
      tipoEstabelecimento: dados.tipoEstabelecimento,
      nome: dados.nome.trim(),
      cnpj: cnpjLimpo,
      inscricaoEstadual: dados.inscricaoEstadual ? dados.inscricaoEstadual.trim() : null,
      inscricaoMunicipal: dados.inscricaoMunicipal ? dados.inscricaoMunicipal.trim() : null,
      criadoEm: new Date(),
    };

    return this.repo.salvarEstabelecimento(novoEstabelecimento);
  }

  /**
   * Lista todos os estabelecimentos (matriz e filiais) vinculados à organização (CA-1)
   */
  public async listarEstabelecimentos(
    organizacaoId: string
  ): Promise<EstabelecimentoOrganizacao[]> {
    if (!organizacaoId || !organizacaoId.trim()) {
      throw new Error('O identificador da organização é obrigatório.');
    }
    return this.repo.listarEstabelecimentosPorOrganizacao(organizacaoId.trim());
  }

  // ============================================================================
  // CA-2 e CA-4: Múltiplos Sócios vinculados à Organização
  // ============================================================================

  /**
   * Cadastra um sócio vinculado à organização (RF-005 / CA-2 / CA-4)
   */
  public async cadastrarSocio(dados: {
    id?: string;
    organizacaoId: string;
    nome: string;
    documento: string;
    qualificacao: string;
    percentualParticipacao: number;
  }): Promise<SocioOrganizacao> {
    const organizacaoId = (dados.organizacaoId || '').trim();
    if (!organizacaoId) {
      throw new Error('O identificador da organização é obrigatório.');
    }

    if (!dados.nome || !dados.nome.trim()) {
      throw new Error('O nome do sócio é obrigatório.');
    }

    const docLimpo = this.limparDigitos(dados.documento);
    if (docLimpo.length !== 11 && docLimpo.length !== 14) {
      throw new Error('O documento do sócio (CPF ou CNPJ) deve conter 11 ou 14 dígitos.');
    }

    if (!dados.qualificacao || !dados.qualificacao.trim()) {
      throw new Error('A qualificação societária do sócio é obrigatória.');
    }

    if (
      typeof dados.percentualParticipacao !== 'number' ||
      dados.percentualParticipacao <= 0 ||
      dados.percentualParticipacao > 100
    ) {
      throw new Error('O percentual de participação deve ser maior que 0 e no máximo 100.');
    }

    // Impede duplicidade do mesmo sócio na mesma organização (CA-4)
    const existente = await this.repo.buscarSocioPorDocumento(organizacaoId, docLimpo);
    if (existente) {
      throw new Error(
        `O sócio com documento '${docLimpo}' já está vinculado a esta organização.`
      );
    }

    const novoSocio: SocioOrganizacao = {
      id: dados.id || crypto.randomUUID(),
      organizacaoId,
      nome: dados.nome.trim(),
      documento: docLimpo,
      qualificacao: dados.qualificacao.trim(),
      percentualParticipacao: dados.percentualParticipacao,
      criadoEm: new Date(),
    };

    return this.repo.salvarSocio(novoSocio);
  }

  /**
   * Lista todos os sócios vinculados à organização (CA-2)
   */
  public async listarSocios(organizacaoId: string): Promise<SocioOrganizacao[]> {
    if (!organizacaoId || !organizacaoId.trim()) {
      throw new Error('O identificador da organização é obrigatório.');
    }
    return this.repo.listarSociosPorOrganizacao(organizacaoId.trim());
  }

  // ============================================================================
  // CA-3 e CA-4: Múltiplos Responsáveis Técnicos vinculados à Organização
  // ============================================================================

  /**
   * Cadastra um responsável técnico vinculado à organização (RF-005 / CA-3 / CA-4)
   */
  public async cadastrarResponsavelTecnico(dados: {
    id?: string;
    organizacaoId: string;
    nome: string;
    cpf: string;
    registroProfissional: string;
    ufRegistro: string;
    qualificacao: string;
  }): Promise<ResponsavelTecnicoOrganizacao> {
    const organizacaoId = (dados.organizacaoId || '').trim();
    if (!organizacaoId) {
      throw new Error('O identificador da organização é obrigatório.');
    }

    if (!dados.nome || !dados.nome.trim()) {
      throw new Error('O nome do responsável técnico é obrigatório.');
    }

    const cpfLimpo = this.limparDigitos(dados.cpf);
    if (cpfLimpo.length !== 11) {
      throw new Error('O CPF do responsável técnico deve conter 11 dígitos.');
    }

    if (!dados.registroProfissional || !dados.registroProfissional.trim()) {
      throw new Error('O registro profissional (ex.: CRC) é obrigatório.');
    }

    if (!dados.ufRegistro || dados.ufRegistro.trim().length !== 2) {
      throw new Error('A UF do registro profissional deve conter 2 caracteres.');
    }

    if (!dados.qualificacao || !dados.qualificacao.trim()) {
      throw new Error('A qualificação do responsável técnico é obrigatória.');
    }

    // Impede duplicidade de responsável técnico na mesma organização (CA-4)
    const existente = await this.repo.buscarResponsavelPorCpfOuRegistro(
      organizacaoId,
      cpfLimpo,
      dados.registroProfissional.trim()
    );
    if (existente) {
      throw new Error(
        'Já existe um responsável técnico com este CPF ou registro profissional vinculado a esta organização.'
      );
    }

    const novoResponsavel: ResponsavelTecnicoOrganizacao = {
      id: dados.id || crypto.randomUUID(),
      organizacaoId,
      nome: dados.nome.trim(),
      cpf: cpfLimpo,
      registroProfissional: dados.registroProfissional.trim(),
      ufRegistro: dados.ufRegistro.trim().toUpperCase(),
      qualificacao: dados.qualificacao.trim(),
      criadoEm: new Date(),
    };

    return this.repo.salvarResponsavelTecnico(novoResponsavel);
  }

  /**
   * Lista todos os responsáveis técnicos vinculados à organização (CA-3)
   */
  public async listarResponsaveisTecnicos(
    organizacaoId: string
  ): Promise<ResponsavelTecnicoOrganizacao[]> {
    if (!organizacaoId || !organizacaoId.trim()) {
      throw new Error('O identificador da organização é obrigatório.');
    }
    return this.repo.listarResponsaveisPorOrganizacao(organizacaoId.trim());
  }

  /**
   * Obtém a visão consolidada da organização contendo seus estabelecimentos/filiais,
   * sócios e responsáveis técnicos (RF-005)
   */
  public async obterEstruturaOrganizacao(
    organizacaoId: string
  ): Promise<EstruturaOrganizacaoConsolidada> {
    const orgId = (organizacaoId || '').trim();
    if (!orgId) {
      throw new Error('O identificador da organização é obrigatório.');
    }

    const [estabelecimentos, socios, responsaveisTecnicos] = await Promise.all([
      this.repo.listarEstabelecimentosPorOrganizacao(orgId),
      this.repo.listarSociosPorOrganizacao(orgId),
      this.repo.listarResponsaveisPorOrganizacao(orgId),
    ]);

    return {
      organizacaoId: orgId,
      estabelecimentos,
      socios,
      responsaveisTecnicos,
    };
  }
}
