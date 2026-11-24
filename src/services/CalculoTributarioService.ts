import * as crypto from 'crypto';
import {
  CadastrarRegraCalculoDTO,
  EntradaCalculoTributario,
  EsferaTributaria,
  MemoriaCalculoTributo,
  RegraCalculoTributario,
  ResultadoCalculoMemoria,
  TipoOperacaoTributaria,
} from '../models/CalculoTributarioModel';
import { EnquadramentoTributario } from '../models/RegimeTributarioEmpresaModel';
import { ICalculoTributarioRepository } from '../repositories/CalculoTributarioRepository';

const ESFERAS_VALIDAS: EsferaTributaria[] = [
  'FEDERAL',
  'ESTADUAL',
  'MUNICIPAL',
];
const TIPOS_OPERACAO_VALIDOS: TipoOperacaoTributaria[] = [
  'VENDA',
  'SERVICO',
  'COMPRA',
  'OUTRA',
];
const REGIMES_VALIDOS: EnquadramentoTributario[] = [
  'SIMPLES_NACIONAL',
  'LUCRO_PRESUMIDO',
  'LUCRO_REAL',
  'MEI',
  'ISENTO_IMUNE',
  'OUTRO',
];
const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;
const REGRA_ARREDONDAMENTO = 'HALF_UP (2 casas decimais)';

/**
 * Serviço de Cálculo Tributário e Memória de Cálculo
 * (SPEC-3.7 / RF-020, RF-021, RF-027, RNF-012)
 */
export class CalculoTributarioService {
  constructor(private readonly repo: ICalculoTributarioRepository) {}

  /**
   * Arredondamento determinístico HALF_UP para 2 casas decimais (RNF-012)
   */
  private arredondarHalfUp(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }

  private validarDataISO(data: string, campo: string): void {
    if (!REGEX_DATA.test(data || '')) {
      throw new Error(`${campo} deve estar no formato YYYY-MM-DD.`);
    }
    const [ano, mes, dia] = data.split('-').map(Number);
    const dt = new Date(Date.UTC(ano, mes - 1, dia));
    if (
      dt.getUTCFullYear() !== ano ||
      dt.getUTCMonth() + 1 !== mes ||
      dt.getUTCDate() !== dia
    ) {
      throw new Error(`${campo} não é uma data calendário válida.`);
    }
  }

  private normalizar(texto: string): string {
    return texto.trim().toUpperCase();
  }

  /**
   * Cadastra nova regra versionada de cálculo por esfera/contexto (CA-1, CA-3, CA-4)
   */
  public async cadastrarRegra(
    dados: CadastrarRegraCalculoDTO
  ): Promise<RegraCalculoTributario> {
    if (!dados.empresaId?.trim() || !dados.tributo?.trim()) {
      throw new Error('empresaId e tributo são obrigatórios.');
    }
    if (!ESFERAS_VALIDAS.includes(dados.esfera)) {
      throw new Error('Esfera tributária inválida.');
    }
    if (!REGIMES_VALIDOS.includes(dados.regime)) {
      throw new Error('Regime tributário inválido.');
    }
    if (!TIPOS_OPERACAO_VALIDOS.includes(dados.tipoOperacao)) {
      throw new Error('Tipo de operação inválido.');
    }
    if (
      !dados.atividade?.trim() ||
      !dados.uf?.trim() ||
      !dados.municipio?.trim()
    ) {
      throw new Error('atividade, uf e municipio são obrigatórios.');
    }

    this.validarDataISO(dados.vigenciaInicio, 'vigenciaInicio');
    this.validarDataISO(dados.vigenciaFim, 'vigenciaFim');
    if (dados.vigenciaInicio > dados.vigenciaFim) {
      throw new Error('vigenciaInicio não pode ser maior que vigenciaFim.');
    }
    if (
      typeof dados.aliquotaPercentual !== 'number' ||
      !Number.isFinite(dados.aliquotaPercentual) ||
      dados.aliquotaPercentual < 0
    ) {
      throw new Error('aliquotaPercentual deve ser um número maior ou igual a zero.');
    }

    const existentes = await this.repo.listarRegrasPorEmpresa(
      dados.empresaId.trim()
    );
    const mesmasChaves = existentes.filter(
      (r) =>
        this.normalizar(r.tributo) === this.normalizar(dados.tributo) &&
        r.esfera === dados.esfera &&
        r.regime === dados.regime &&
        this.normalizar(r.atividade) === this.normalizar(dados.atividade) &&
        this.normalizar(r.uf) === this.normalizar(dados.uf) &&
        this.normalizar(r.municipio) === this.normalizar(dados.municipio) &&
        r.tipoOperacao === dados.tipoOperacao
    );
    const maiorVersao = mesmasChaves.reduce(
      (max, item) => Math.max(max, item.versao),
      0
    );

    const regra: RegraCalculoTributario = {
      id: crypto.randomUUID(),
      empresaId: dados.empresaId.trim(),
      tributo: this.normalizar(dados.tributo),
      esfera: dados.esfera,
      versao: maiorVersao + 1,
      regime: dados.regime,
      atividade: dados.atividade.trim(),
      uf: this.normalizar(dados.uf),
      municipio: dados.municipio.trim(),
      tipoOperacao: dados.tipoOperacao,
      vigenciaInicio: dados.vigenciaInicio,
      vigenciaFim: dados.vigenciaFim,
      aliquotaPercentual: this.arredondarHalfUp(dados.aliquotaPercentual),
      tabelaFicticia: true,
      criadoEm: new Date(),
    };

    return this.repo.salvarRegra(regra);
  }

  /**
   * Executa cálculo determinístico e gera memória de cálculo detalhada (CA-1 a CA-4)
   */
  public async calcular(
    empresaId: string,
    entrada: EntradaCalculoTributario
  ): Promise<ResultadoCalculoMemoria> {
    if (!empresaId?.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    if (!REGIMES_VALIDOS.includes(entrada.regime)) {
      throw new Error('Regime tributário inválido.');
    }
    if (!TIPOS_OPERACAO_VALIDOS.includes(entrada.tipoOperacao)) {
      throw new Error('Tipo de operação inválido.');
    }
    if (
      !entrada.atividade?.trim() ||
      !entrada.uf?.trim() ||
      !entrada.municipio?.trim()
    ) {
      throw new Error('atividade, uf e municipio são obrigatórios.');
    }
    this.validarDataISO(entrada.dataOperacao, 'dataOperacao');

    if (
      typeof entrada.valorOperacao !== 'number' ||
      !Number.isFinite(entrada.valorOperacao) ||
      entrada.valorOperacao <= 0
    ) {
      throw new Error('valorOperacao deve ser maior que zero.');
    }

    const deducoes = entrada.deducoes ?? 0;
    const retencoes = entrada.retencoes ?? 0;
    const creditos = entrada.creditos ?? 0;
    if (
      !Number.isFinite(deducoes) ||
      deducoes < 0 ||
      !Number.isFinite(retencoes) ||
      retencoes < 0 ||
      !Number.isFinite(creditos) ||
      creditos < 0
    ) {
      throw new Error(
        'deducoes, retencoes e creditos não podem ser negativos.'
      );
    }

    const regras = await this.repo.listarRegrasPorEmpresa(empresaId.trim());
    const compativeis = regras.filter(
      (r) =>
        r.regime === entrada.regime &&
        this.normalizar(r.atividade) === this.normalizar(entrada.atividade) &&
        this.normalizar(r.uf) === this.normalizar(entrada.uf) &&
        this.normalizar(r.municipio) === this.normalizar(entrada.municipio) &&
        r.tipoOperacao === entrada.tipoOperacao &&
        r.vigenciaInicio <= entrada.dataOperacao &&
        entrada.dataOperacao <= r.vigenciaFim
    );

    if (compativeis.length === 0) {
      const erro = new Error(
        `Nenhuma regra tributária vigente encontrada para o cenário informado em ${entrada.dataOperacao}.`
      ) as Error & { statusCode?: number };
      erro.statusCode = 404;
      throw erro;
    }

    // Seleciona a versão mais recente vigente por esfera e tributo
    const maisRecentes = new Map<string, RegraCalculoTributario>();
    for (const regra of compativeis) {
      const chave = `${regra.esfera}:${regra.tributo}`;
      const atual = maisRecentes.get(chave);
      if (!atual || regra.versao > atual.versao) {
        maisRecentes.set(chave, regra);
      }
    }

    const baseCalculoBruta = this.arredondarHalfUp(entrada.valorOperacao);
    const deducoesArr = this.arredondarHalfUp(deducoes);
    const baseCalculoTributavel = this.arredondarHalfUp(
      Math.max(0, baseCalculoBruta - deducoesArr)
    );
    const retencoesArr = this.arredondarHalfUp(retencoes);
    const creditosArr = this.arredondarHalfUp(creditos);

    const regrasOrdenadas = Array.from(maisRecentes.values()).sort((a, b) =>
      `${a.esfera}:${a.tributo}`.localeCompare(`${b.esfera}:${b.tributo}`)
    );

    const memorias: MemoriaCalculoTributo[] = regrasOrdenadas.map((regra) => {
      const valorBrutoCalculado = this.arredondarHalfUp(
        baseCalculoTributavel * (regra.aliquotaPercentual / 100)
      );
      const valorFinalTributo = this.arredondarHalfUp(
        Math.max(0, valorBrutoCalculado - retencoesArr - creditosArr)
      );

      return {
        tributo: regra.tributo,
        esfera: regra.esfera,
        regraId: regra.id,
        versaoRegra: regra.versao,
        baseCalculoBruta,
        deducoes: deducoesArr,
        baseCalculoTributavel,
        aliquotaPercentual: regra.aliquotaPercentual,
        valorBrutoCalculado,
        retencoes: retencoesArr,
        creditos: creditosArr,
        valorFinalTributo,
        regraArredondamento: REGRA_ARREDONDAMENTO,
        formulaAplicada: `max(0, (${baseCalculoTributavel.toFixed(2)} * ${regra.aliquotaPercentual.toFixed(2)}%) - ${retencoesArr.toFixed(2)} - ${creditosArr.toFixed(2)})`,
      };
    });

    const totalTributos = this.arredondarHalfUp(
      memorias.reduce((acc, m) => acc + m.valorFinalTributo, 0)
    );

    const resultado: ResultadoCalculoMemoria = {
      id: crypto.randomUUID(),
      empresaId: empresaId.trim(),
      dataOperacao: entrada.dataOperacao,
      regime: entrada.regime,
      atividade: entrada.atividade.trim(),
      uf: this.normalizar(entrada.uf),
      municipio: entrada.municipio.trim(),
      tipoOperacao: entrada.tipoOperacao,
      valorOperacao: baseCalculoBruta,
      totalTributos,
      memorias,
      avisoRegraParametrizada:
        'Cálculo realizado com regras parametrizadas de demonstração (não oficial).',
      calculadoEm: new Date(),
    };

    return this.repo.salvarResultado(resultado);
  }

  public async listarCalculos(
    empresaId: string
  ): Promise<ResultadoCalculoMemoria[]> {
    if (!empresaId?.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    return this.repo.listarResultadosPorEmpresa(empresaId.trim());
  }
}
