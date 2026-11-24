import * as crypto from 'crypto';
import {
  ContatoCadastro,
  DadosFiscaisVigencia,
  EnderecoCadastro,
  PessoaEmpresa,
  ResponsavelCadastro,
  TipoPessoa,
} from '../models/PessoaEmpresaModel';
import { IPessoaEmpresaRepository } from '../repositories/PessoaEmpresaRepository';

/**
 * Serviço de Cadastro de Pessoas (PF), Empresas (PJ) e Dados Fiscais com Vigência
 * Implementa a SPEC-1.6 (RF-001 e RF-002)
 */
export class PessoaEmpresaService {
  constructor(private readonly repo: IPessoaEmpresaRepository) {}

  // ============================================================================
  // Utilitários de Validação de CPF e CNPJ (CA-1 e CA-2)
  // ============================================================================

  /**
   * Remove caracteres não numéricos de um CPF ou CNPJ
   */
  public limparDocumento(documento: string): string {
    return (documento || '').replace(/\D/g, '');
  }

  /**
   * Valida estruturalmente um CPF (11 dígitos e cálculo dos dígitos verificadores - Módulo 11)
   */
  public validarCpf(cpf: string): boolean {
    const limpo = this.limparDocumento(cpf);
    if (limpo.length !== 11 || /^(\d)\1{10}$/.test(limpo)) {
      return false;
    }

    const calcularDigito = (base: string, pesoInicial: number): number => {
      let soma = 0;
      for (let i = 0; i < base.length; i++) {
        soma += parseInt(base.charAt(i), 10) * (pesoInicial - i);
      }
      const resto = (soma * 10) % 11;
      return resto === 10 || resto === 11 ? 0 : resto;
    };

    const d1 = calcularDigito(limpo.substring(0, 9), 10);
    const d2 = calcularDigito(limpo.substring(0, 10), 11);

    return (
      d1 === parseInt(limpo.charAt(9), 10) && d2 === parseInt(limpo.charAt(10), 10)
    );
  }

  /**
   * Valida estruturalmente um CNPJ (14 dígitos e cálculo dos dígitos verificadores - Módulo 11)
   */
  public validarCnpj(cnpj: string): boolean {
    const limpo = this.limparDocumento(cnpj);
    if (limpo.length !== 14 || /^(\d)\1{13}$/.test(limpo)) {
      return false;
    }

    const calcularDigito = (base: string, pesos: number[]): number => {
      let soma = 0;
      for (let i = 0; i < base.length; i++) {
        soma += parseInt(base.charAt(i), 10) * pesos[i];
      }
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };

    const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    const d1 = calcularDigito(limpo.substring(0, 12), pesos1);
    const d2 = calcularDigito(limpo.substring(0, 13), pesos2);

    return (
      d1 === parseInt(limpo.charAt(12), 10) && d2 === parseInt(limpo.charAt(13), 10)
    );
  }

  // ============================================================================
  // RF-001: Cadastro de Pessoa Física (PF) e Pessoa Jurídica (PJ) (CA-1 e CA-2)
  // ============================================================================

  /**
   * Cadastra uma Pessoa Física (PF) ou Pessoa Jurídica (PJ) validando:
   * - Tipo de pessoa ('PF' ou 'PJ')
   * - Nome/Razão Social obrigatórios
   * - CPF válido (para PF) ou CNPJ válido (para PJ) (CA-1 e CA-2)
   * - Bloqueio de duplicidade de documento na mesma organização (CA-2)
   * - Contatos, endereços e responsáveis (CA-1)
   */
  public async cadastrarPessoaEmpresa(dados: {
    id?: string;
    organizacaoId: string;
    tipoPessoa: TipoPessoa;
    nomeRazaoSocial: string;
    nomeFantasia?: string | null;
    documento: string;
    inscricaoEstadual?: string | null;
    inscricaoMunicipal?: string | null;
    contatos: ContatoCadastro[];
    enderecos: EnderecoCadastro[];
    responsaveis: ResponsavelCadastro[];
  }): Promise<PessoaEmpresa> {
    if (!dados.organizacaoId || !dados.organizacaoId.trim()) {
      throw new Error('O identificador da organização é obrigatório.');
    }

    if (dados.tipoPessoa !== 'PF' && dados.tipoPessoa !== 'PJ') {
      throw new Error("O tipo de pessoa deve ser 'PF' ou 'PJ'.");
    }

    if (!dados.nomeRazaoSocial || !dados.nomeRazaoSocial.trim()) {
      throw new Error('O nome ou razão social é obrigatório.');
    }

    const docLimpo = this.limparDocumento(dados.documento);

    // Validação do CPF (PF) ou CNPJ (PJ) (CA-1 e CA-2)
    if (dados.tipoPessoa === 'PF') {
      if (!this.validarCpf(docLimpo)) {
        throw new Error('CPF inválido para cadastro de Pessoa Física.');
      }
    } else {
      if (!this.validarCnpj(docLimpo)) {
        throw new Error('CNPJ inválido para cadastro de Pessoa Jurídica.');
      }
    }

    // Verifica duplicidade de documento na mesma organização (CA-2)
    const existente = await this.repo.buscarPorOrganizacaoEDocumento(
      dados.organizacaoId,
      docLimpo
    );
    if (existente) {
      throw new Error(
        `Já existe um cadastro com o documento '${docLimpo}' nesta organização.`
      );
    }

    // Valida presença de ao menos um contato, endereço e responsável (RF-001 / CA-1)
    if (!Array.isArray(dados.contatos) || dados.contatos.length === 0) {
      throw new Error('Informe ao menos um contato para o cadastro.');
    }
    if (!Array.isArray(dados.enderecos) || dados.enderecos.length === 0) {
      throw new Error('Informe ao menos um endereço para o cadastro.');
    }
    if (!Array.isArray(dados.responsaveis) || dados.responsaveis.length === 0) {
      throw new Error('Informe ao menos um responsável para o cadastro.');
    }

    const novaEntidade: PessoaEmpresa = {
      id: dados.id || crypto.randomUUID(),
      organizacaoId: dados.organizacaoId.trim(),
      tipoPessoa: dados.tipoPessoa,
      nomeRazaoSocial: dados.nomeRazaoSocial.trim(),
      nomeFantasia: dados.nomeFantasia ? dados.nomeFantasia.trim() : null,
      documento: docLimpo,
      inscricaoEstadual: dados.inscricaoEstadual ? dados.inscricaoEstadual.trim() : null,
      inscricaoMunicipal: dados.inscricaoMunicipal ? dados.inscricaoMunicipal.trim() : null,
      contatos: dados.contatos,
      enderecos: dados.enderecos,
      responsaveis: dados.responsaveis,
      criadoEm: new Date(),
    };

    return this.repo.salvarPessoaEmpresa(novaEntidade);
  }

  /**
   * Lista os cadastros de pessoas e empresas de uma organização
   */
  public async listarPorOrganizacao(organizacaoId: string): Promise<PessoaEmpresa[]> {
    return this.repo.listarPorOrganizacao(organizacaoId);
  }

  // ============================================================================
  // RF-002: Registro de Dados Fiscais, Enquadramentos e Vigência (CA-3 e CA-4)
  // ============================================================================

  /**
   * Registra dados fiscais vinculados a uma PF ou PJ existente:
   * - Regime tributário, atividade econômica, CNAE, natureza jurídica, município/UF, enquadramentos
   * - Valida datas de vigência (`vigenciaFim >= vigenciaInicio`) (CA-3 e CA-4)
   */
  public async registrarDadosFiscais(dados: {
    id?: string;
    pessoaEmpresaId: string;
    regimeTributario: string;
    atividadeEconomica: string;
    cnae: string;
    naturezaJuridica: string;
    municipio: string;
    uf: string;
    enquadramentos: string[];
    vigenciaInicio: string;
    vigenciaFim?: string | null;
  }): Promise<DadosFiscaisVigencia> {
    const cadastro = await this.repo.buscarPessoaEmpresaPorId(dados.pessoaEmpresaId);
    if (!cadastro) {
      throw new Error('Cadastro de Pessoa/Empresa não encontrado.');
    }

    // Validação dos campos fiscais obrigatórios (RF-002 / CA-4)
    if (!dados.regimeTributario || !dados.regimeTributario.trim()) {
      throw new Error('O regime tributário é obrigatório.');
    }
    if (!dados.atividadeEconomica || !dados.atividadeEconomica.trim()) {
      throw new Error('A atividade econômica é obrigatória.');
    }
    if (!dados.cnae || !dados.cnae.trim()) {
      throw new Error('O código CNAE é obrigatório.');
    }
    if (!dados.naturezaJuridica || !dados.naturezaJuridica.trim()) {
      throw new Error('A natureza jurídica é obrigatória.');
    }
    if (!dados.municipio || !dados.municipio.trim()) {
      throw new Error('O município é obrigatório.');
    }
    if (!dados.uf || dados.uf.trim().length !== 2) {
      throw new Error('A UF deve conter exatamente 2 caracteres.');
    }
    if (!Array.isArray(dados.enquadramentos) || dados.enquadramentos.length === 0) {
      throw new Error('Informe ao menos um enquadramento fiscal.');
    }
    if (!dados.vigenciaInicio || !/^\d{4}-\d{2}-\d{2}$/.test(dados.vigenciaInicio)) {
      throw new Error('A data de início de vigência (YYYY-MM-DD) é obrigatória.');
    }

    const vigenciaFim = dados.vigenciaFim ? dados.vigenciaFim.trim() : null;
    if (vigenciaFim) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(vigenciaFim)) {
        throw new Error('A data de fim de vigência deve estar no formato YYYY-MM-DD.');
      }
      // Valida se a data final não é anterior à data inicial (CA-4)
      if (vigenciaFim < dados.vigenciaInicio) {
        throw new Error(
          'Vigência inválida: a data final de vigência não pode ser anterior à data inicial.'
        );
      }
    }

    const novoRegistroFiscal: DadosFiscaisVigencia = {
      id: dados.id || crypto.randomUUID(),
      pessoaEmpresaId: dados.pessoaEmpresaId,
      regimeTributario: dados.regimeTributario.trim(),
      atividadeEconomica: dados.atividadeEconomica.trim(),
      cnae: dados.cnae.trim(),
      naturezaJuridica: dados.naturezaJuridica.trim(),
      municipio: dados.municipio.trim(),
      uf: dados.uf.trim().toUpperCase(),
      enquadramentos: dados.enquadramentos.map((e) => e.trim()),
      vigenciaInicio: dados.vigenciaInicio,
      vigenciaFim,
      criadoEm: new Date(),
    };

    return this.repo.salvarDadosFiscais(novoRegistroFiscal);
  }

  /**
   * Lista os registros fiscais e períodos de vigência de uma pessoa/empresa
   */
  public async listarDadosFiscais(
    pessoaEmpresaId: string
  ): Promise<DadosFiscaisVigencia[]> {
    const cadastro = await this.repo.buscarPessoaEmpresaPorId(pessoaEmpresaId);
    if (!cadastro) {
      throw new Error('Cadastro de Pessoa/Empresa não encontrado.');
    }
    return this.repo.listarDadosFiscaisPorPessoaEmpresa(pessoaEmpresaId);
  }
}
