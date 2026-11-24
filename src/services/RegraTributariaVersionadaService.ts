import * as crypto from 'crypto';
import { RegimeTributario } from '../models/ClassificacaoOperacaoModel';
import {
  RegraTributariaVersionada,
  ResultadoCalculoTributario,
  SituacaoContribuinte,
} from '../models/RegraTributariaVersionadaModel';
import { IRegraTributariaVersionadaRepository } from '../repositories/RegraTributariaVersionadaRepository';

const REGIMES_VALIDOS: RegimeTributario[] = [
  'SIMPLES_NACIONAL',
  'LUCRO_PRESUMIDO',
  'LUCRO_REAL',
];
const SITUACOES_VALIDAS: SituacaoContribuinte[] = [
  'REGULAR',
  'ISENTO',
  'SUSPENSO',
  'IMUNE',
];

/**
 * Serviço para parametrização versionada de regras tributárias e cálculos por
 * exercício, vigência, regime, jurisdição e situação do contribuinte
 * (SPEC-3.5 / RF-080, RB-004)
 */
export class RegraTributariaVersionadaService {
  constructor(private readonly repo: IRegraTributariaVersionadaRepository) {}

  private arredondar(valor: number): number {
    return Number(valor.toFixed(2));
  }

  private validarDadosRegra(dados: {
    empresaId: string;
    codigoRegra: string;
    exercicio: number;
    vigenciaInicio: string;
    vigenciaFim: string;
    regime: RegimeTributario;
    jurisdicao: string;
    situacaoContribuinte: SituacaoContribuinte;
    aliquotaPercentual: number;
    parcelaDeduzir: number;
    leiauteVersao: string;
  }): void {
    if (!dados.empresaId?.trim() || !dados.codigoRegra?.trim()) {
      throw new Error('empresaId e codigoRegra são obrigatórios.');
    }
    if (
      !Number.isInteger(dados.exercicio) ||
      dados.exercicio < 2000 ||
      dados.exercicio > 2100
    ) {
      throw new Error('O exercício fiscal deve ser um ano válido (ex.: 2026).');
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dados.vigenciaInicio || '') ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dados.vigenciaFim || '')
    ) {
      throw new Error(
        'vigenciaInicio e vigenciaFim devem estar no formato YYYY-MM-DD.'
      );
    }
    if (dados.vigenciaInicio > dados.vigenciaFim) {
      throw new Error('vigenciaInicio não pode ser maior que vigenciaFim.');
    }
    if (!REGIMES_VALIDOS.includes(dados.regime)) {
      throw new Error('Regime tributário inválido.');
    }
    if (!dados.jurisdicao?.trim()) {
      throw new Error('A jurisdição é obrigatória.');
    }
    if (!SITUACOES_VALIDAS.includes(dados.situacaoContribuinte)) {
      throw new Error('Situação do contribuinte inválida.');
    }
    if (
      typeof dados.aliquotaPercentual !== 'number' ||
      dados.aliquotaPercentual < 0
    ) {
      throw new Error('A alíquota percentual não pode ser negativa.');
    }
    if (typeof dados.parcelaDeduzir !== 'number' || dados.parcelaDeduzir < 0) {
      throw new Error('A parcela a deduzir não pode ser negativa.');
    }
    if (!dados.leiauteVersao?.trim()) {
      throw new Error('A versão do leiaute é obrigatória.');
    }
  }

  /**
   * Cadastra a versão inicial (versao: 1) de uma regra tributária (CA-1 e CA-4)
   */
  public async cadastrarRegra(dados: {
    empresaId: string;
    codigoRegra: string;
    exercicio: number;
    vigenciaInicio: string;
    vigenciaFim: string;
    regime: RegimeTributario;
    jurisdicao: string;
    situacaoContribuinte: SituacaoContribuinte;
    aliquotaPercentual: number;
    parcelaDeduzir?: number;
    leiauteVersao: string;
  }): Promise<RegraTributariaVersionada> {
    const parcelaDeduzir = dados.parcelaDeduzir ?? 0;
    this.validarDadosRegra({ ...dados, parcelaDeduzir });

    const versoes = await this.repo.listarVersoesPorCodigo(
      dados.empresaId.trim(),
      dados.codigoRegra.trim()
    );
    const proximaVersao =
      versoes.length > 0 ? versoes[versoes.length - 1].versao + 1 : 1;

    const regra: RegraTributariaVersionada = {
      id: crypto.randomUUID(),
      empresaId: dados.empresaId.trim(),
      codigoRegra: dados.codigoRegra.trim(),
      versao: proximaVersao,
      exercicio: dados.exercicio,
      vigenciaInicio: dados.vigenciaInicio,
      vigenciaFim: dados.vigenciaFim,
      regime: dados.regime,
      jurisdicao: dados.jurisdicao.trim(),
      situacaoContribuinte: dados.situacaoContribuinte,
      aliquotaPercentual: this.arredondar(dados.aliquotaPercentual),
      parcelaDeduzir: this.arredondar(parcelaDeduzir),
      leiauteVersao: dados.leiauteVersao.trim(),
      tabelaFicticia: true,
      criadoEm: new Date(),
    };

    return this.repo.salvar(regra);
  }

  /**
   * Atualiza uma regra de forma controlada gerando nova versão e mantendo histórico (CA-1)
   */
  public async atualizarRegra(
    empresaId: string,
    codigoRegra: string,
    dados: Partial<{
      exercicio: number;
      vigenciaInicio: string;
      vigenciaFim: string;
      regime: RegimeTributario;
      jurisdicao: string;
      situacaoContribuinte: SituacaoContribuinte;
      aliquotaPercentual: number;
      parcelaDeduzir: number;
      leiauteVersao: string;
    }>
  ): Promise<RegraTributariaVersionada> {
    const versoes = await this.repo.listarVersoesPorCodigo(
      empresaId.trim(),
      codigoRegra.trim()
    );
    if (versoes.length === 0) {
      throw new Error(
        `Regra '${codigoRegra}' não encontrada para esta empresa.`
      );
    }

    const ultima = versoes[versoes.length - 1];
    const mesclado = {
      empresaId: ultima.empresaId,
      codigoRegra: ultima.codigoRegra,
      exercicio: dados.exercicio ?? ultima.exercicio,
      vigenciaInicio: dados.vigenciaInicio ?? ultima.vigenciaInicio,
      vigenciaFim: dados.vigenciaFim ?? ultima.vigenciaFim,
      regime: dados.regime ?? ultima.regime,
      jurisdicao: dados.jurisdicao ?? ultima.jurisdicao,
      situacaoContribuinte:
        dados.situacaoContribuinte ?? ultima.situacaoContribuinte,
      aliquotaPercentual: dados.aliquotaPercentual ?? ultima.aliquotaPercentual,
      parcelaDeduzir: dados.parcelaDeduzir ?? ultima.parcelaDeduzir,
      leiauteVersao: dados.leiauteVersao ?? ultima.leiauteVersao,
    };

    this.validarDadosRegra(mesclado);

    const novaVersao: RegraTributariaVersionada = {
      id: crypto.randomUUID(),
      ...mesclado,
      versao: ultima.versao + 1,
      aliquotaPercentual: this.arredondar(mesclado.aliquotaPercentual),
      parcelaDeduzir: this.arredondar(mesclado.parcelaDeduzir),
      tabelaFicticia: true,
      criadoEm: new Date(),
    };

    return this.repo.salvar(novaVersao);
  }

  public async listarRegras(
    empresaId: string,
    codigoRegra?: string
  ): Promise<RegraTributariaVersionada[]> {
    if (!empresaId?.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    if (codigoRegra?.trim()) {
      return this.repo.listarVersoesPorCodigo(empresaId, codigoRegra.trim());
    }
    return this.repo.listarPorEmpresa(empresaId);
  }

  /**
   * Executa cálculo tributário selecionando a regra vigente correta para
   * exercício, data, regime, jurisdição e situação do contribuinte (CA-2, CA-3 e CA-4)
   */
  public async calcular(
    empresaId: string,
    dados: {
      codigoRegra?: string;
      exercicio: number;
      dataCalculo: string;
      regime: RegimeTributario;
      jurisdicao: string;
      situacaoContribuinte: SituacaoContribuinte;
      baseCalculo: number;
    }
  ): Promise<ResultadoCalculoTributario> {
    if (!empresaId?.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    if (!Number.isInteger(dados.exercicio)) {
      throw new Error('O exercício fiscal é obrigatório.');
    }
    if (!dados.dataCalculo || !/^\d{4}-\d{2}-\d{2}$/.test(dados.dataCalculo)) {
      throw new Error('dataCalculo deve estar no formato YYYY-MM-DD.');
    }
    if (typeof dados.baseCalculo !== 'number' || dados.baseCalculo <= 0) {
      throw new Error('baseCalculo deve ser maior que zero.');
    }

    const todas = await this.repo.listarPorEmpresa(empresaId);
    const jurisdicaoNorm = (dados.jurisdicao || '').trim().toLowerCase();

    const compativeis = todas
      .filter(
        (r) =>
          (!dados.codigoRegra || r.codigoRegra === dados.codigoRegra) &&
          r.exercicio === dados.exercicio &&
          r.vigenciaInicio <= dados.dataCalculo &&
          dados.dataCalculo <= r.vigenciaFim &&
          r.regime === dados.regime &&
          r.jurisdicao.toLowerCase() === jurisdicaoNorm &&
          r.situacaoContribuinte === dados.situacaoContribuinte
      )
      .sort((a, b) => b.versao - a.versao);

    if (compativeis.length === 0) {
      throw new Error(
        `Nenhuma regra tributária vigente encontrada para exercício ${dados.exercicio}, data ${dados.dataCalculo}, regime ${dados.regime}, jurisdição '${dados.jurisdicao}' e situação '${dados.situacaoContribuinte}'.`
      );
    }

    const regra = compativeis[0];
    const valorBruto = dados.baseCalculo * (regra.aliquotaPercentual / 100);
    const valorImposto = this.arredondar(
      Math.max(0, valorBruto - regra.parcelaDeduzir)
    );

    return {
      empresaId,
      codigoRegra: regra.codigoRegra,
      versaoUtilizada: regra.versao,
      exercicio: regra.exercicio,
      dataCalculo: dados.dataCalculo,
      regime: regra.regime,
      jurisdicao: regra.jurisdicao,
      situacaoContribuinte: regra.situacaoContribuinte,
      baseCalculo: this.arredondar(dados.baseCalculo),
      aliquotaPercentual: regra.aliquotaPercentual,
      parcelaDeduzir: regra.parcelaDeduzir,
      valorImposto,
      leiauteVersao: regra.leiauteVersao,
      avisoRegraParametrizada:
        'Cálculo realizado com regra tributária parametrizada de demonstração (não oficial).',
    };
  }
}
