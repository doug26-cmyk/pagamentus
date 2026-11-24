import * as crypto from 'crypto';
import {
  ClassificacaoOperacao,
  RegimeTributario,
  RegraClassificacaoOperacao,
  TipoOperacaoFiscal,
} from '../models/ClassificacaoOperacaoModel';
import { IClassificacaoOperacaoRepository } from '../repositories/ClassificacaoOperacaoRepository';

const REGIMES_VALIDOS: RegimeTributario[] = [
  'SIMPLES_NACIONAL',
  'LUCRO_PRESUMIDO',
  'LUCRO_REAL',
];
const TIPOS_OPERACAO_VALIDOS: TipoOperacaoFiscal[] = [
  'ENTRADA',
  'SAIDA',
  'SERVICO',
];

/**
 * Serviço para classificação fiscal de operações por natureza, CFOP, NCM e
 * CST/CSOSN conforme o regime tributário usando tabelas fictícias configuráveis
 * (SPEC-3.4 / RF-019)
 */
export class ClassificacaoOperacaoService {
  constructor(private readonly repo: IClassificacaoOperacaoRepository) {}

  /**
   * Cadastra uma regra fictícia de classificação fiscal para a empresa (CA-1, CA-2 e CA-4)
   */
  public async cadastrarRegra(dados: {
    empresaId: string;
    regime: RegimeTributario;
    tipoOperacao: TipoOperacaoFiscal;
    natureza: string;
    ncmPrefixo: string;
    cfop: string;
    cstCsosn: string;
  }): Promise<RegraClassificacaoOperacao> {
    const empresaId = (dados.empresaId || '').trim();
    if (!empresaId) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    if (!REGIMES_VALIDOS.includes(dados.regime)) {
      throw new Error(
        `Regime tributário inválido. Valores permitidos: ${REGIMES_VALIDOS.join(', ')}.`
      );
    }
    if (!TIPOS_OPERACAO_VALIDOS.includes(dados.tipoOperacao)) {
      throw new Error(
        `Tipo de operação inválido. Valores permitidos: ${TIPOS_OPERACAO_VALIDOS.join(', ')}.`
      );
    }
    if (!dados.natureza?.trim()) {
      throw new Error('A natureza da operação é obrigatória.');
    }
    if (!dados.ncmPrefixo || !/^\d{1,8}$/.test(dados.ncmPrefixo)) {
      throw new Error('ncmPrefixo deve conter de 1 a 8 dígitos numéricos.');
    }
    if (!dados.cfop || !/^\d{4}$/.test(dados.cfop)) {
      throw new Error('O CFOP deve conter exatamente 4 dígitos.');
    }
    if (!dados.cstCsosn?.trim()) {
      throw new Error('O código CST/CSOSN é obrigatório.');
    }

    const regra: RegraClassificacaoOperacao = {
      id: crypto.randomUUID(),
      empresaId,
      regime: dados.regime,
      tipoOperacao: dados.tipoOperacao,
      natureza: dados.natureza.trim(),
      ncmPrefixo: dados.ncmPrefixo,
      cfop: dados.cfop,
      cstCsosn: dados.cstCsosn.trim(),
      tabelaFicticia: true,
      criadoEm: new Date(),
    };

    return this.repo.salvarRegra(regra);
  }

  public async listarRegras(
    empresaId: string
  ): Promise<RegraClassificacaoOperacao[]> {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    return this.repo.listarRegrasPorEmpresa(empresaId);
  }

  /**
   * Classifica uma operação com base nas regras fictícias da empresa (CA-1, CA-2 e CA-4)
   */
  public async classificarOperacao(dados: {
    empresaId: string;
    regime: RegimeTributario;
    tipoOperacao: TipoOperacaoFiscal;
    natureza: string;
    ncm: string;
  }): Promise<ClassificacaoOperacao> {
    const empresaId = (dados.empresaId || '').trim();
    if (!empresaId) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    if (!REGIMES_VALIDOS.includes(dados.regime)) {
      throw new Error(
        `Regime tributário inválido. Valores permitidos: ${REGIMES_VALIDOS.join(', ')}.`
      );
    }
    if (!TIPOS_OPERACAO_VALIDOS.includes(dados.tipoOperacao)) {
      throw new Error(
        `Tipo de operação inválido. Valores permitidos: ${TIPOS_OPERACAO_VALIDOS.join(', ')}.`
      );
    }
    if (!dados.natureza?.trim()) {
      throw new Error('A natureza da operação é obrigatória.');
    }
    if (!dados.ncm || !/^\d{8}$/.test(dados.ncm)) {
      throw new Error('O código NCM deve conter exatamente 8 dígitos.');
    }

    const regras = await this.repo.listarRegrasPorEmpresa(empresaId);
    const naturezaNorm = dados.natureza.trim().toLowerCase();

    // Seleciona regras compatíveis e prioriza a de prefixo NCM mais específico
    const compativeis = regras
      .filter(
        (r) =>
          r.regime === dados.regime &&
          r.tipoOperacao === dados.tipoOperacao &&
          r.natureza.toLowerCase() === naturezaNorm &&
          dados.ncm.startsWith(r.ncmPrefixo)
      )
      .sort((a, b) => b.ncmPrefixo.length - a.ncmPrefixo.length);

    if (compativeis.length === 0) {
      throw new Error(
        `Nenhuma regra fictícia de classificação compatível encontrada para regime '${dados.regime}', operação '${dados.tipoOperacao}', natureza '${dados.natureza}' e NCM '${dados.ncm}'.`
      );
    }

    const regra = compativeis[0];
    const classificacao: ClassificacaoOperacao = {
      id: crypto.randomUUID(),
      empresaId,
      regime: dados.regime,
      tipoOperacao: dados.tipoOperacao,
      natureza: dados.natureza.trim(),
      ncm: dados.ncm,
      cfop: regra.cfop,
      cstCsosn: regra.cstCsosn,
      regraAplicadaId: regra.id,
      avisoTabelaFicticia:
        'Classificação gerada com base em tabela fictícia configurável (não oficial).',
      classificadoEm: new Date(),
    };

    return this.repo.salvarClassificacao(classificacao);
  }

  /**
   * Lista todas as classificações registradas para a empresa (CA-3)
   */
  public async listarClassificacoes(
    empresaId: string
  ): Promise<ClassificacaoOperacao[]> {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    return this.repo.listarClassificacoesPorEmpresa(empresaId);
  }
}
