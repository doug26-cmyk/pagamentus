import * as crypto from 'crypto';
import {
  EnquadramentoTributario,
  OpcaoRegimeTributario,
  RegistrarOpcaoRegimeDTO,
  SegregacaoReceita,
} from '../models/RegimeTributarioEmpresaModel';
import { IRegimeTributarioEmpresaRepository } from '../repositories/RegimeTributarioEmpresaRepository';

const ENQUADRAMENTOS_VALIDOS: EnquadramentoTributario[] = [
  'SIMPLES_NACIONAL',
  'LUCRO_PRESUMIDO',
  'LUCRO_REAL',
  'MEI',
  'ISENTO_IMUNE',
  'OUTRO',
];

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Serviço para parametrização de regimes tributários e manutenção de histórico
 * com vigência temporal (SPEC-3.6 / RF-025, RF-026)
 */
export class RegimeTributarioEmpresaService {
  constructor(private readonly repo: IRegimeTributarioEmpresaRepository) {}

  private validarDataISO(data: string, campo: string): void {
    if (!REGEX_DATA.test(data)) {
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

  private validarSegregacao(segregacoes: SegregacaoReceita[]): void {
    for (const item of segregacoes) {
      if (!item.categoria?.trim()) {
        throw new Error('Categoria de segregação de receita é obrigatória.');
      }
      if (
        typeof item.percentual !== 'number' ||
        !Number.isFinite(item.percentual) ||
        item.percentual < 0 ||
        item.percentual > 100
      ) {
        throw new Error(
          'Percentual de segregação de receita deve estar entre 0 e 100.'
        );
      }
    }
  }

  /**
   * Registra uma opção de regime tributário preservando o histórico anterior (CA-1, CA-2, CA-3)
   */
  public async registrarOpcao(
    dados: RegistrarOpcaoRegimeDTO
  ): Promise<OpcaoRegimeTributario> {
    if (!dados.empresaId?.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    if (!ENQUADRAMENTOS_VALIDOS.includes(dados.regime)) {
      throw new Error('Regime ou enquadramento tributário inválido.');
    }
    if (!dados.vigenciaInicio) {
      throw new Error('vigenciaInicio é obrigatória.');
    }
    this.validarDataISO(dados.vigenciaInicio, 'vigenciaInicio');

    if (dados.vigenciaFim !== undefined && dados.vigenciaFim !== '') {
      this.validarDataISO(dados.vigenciaFim, 'vigenciaFim');
      if (dados.vigenciaInicio > dados.vigenciaFim) {
        throw new Error('vigenciaInicio não pode ser maior que vigenciaFim.');
      }
    }

    const segregacaoReceitas = dados.segregacaoReceitas ?? [];
    this.validarSegregacao(segregacaoReceitas);

    const opcao: OpcaoRegimeTributario = {
      id: crypto.randomUUID(),
      empresaId: dados.empresaId.trim(),
      regime: dados.regime,
      vigenciaInicio: dados.vigenciaInicio,
      vigenciaFim: dados.vigenciaFim || undefined,
      anexo: dados.anexo?.trim() || undefined,
      faixa: dados.faixa?.trim() || undefined,
      atividades: (dados.atividades ?? []).map((a) => a.trim()).filter(Boolean),
      segregacaoReceitas: segregacaoReceitas.map((s) => ({
        categoria: s.categoria.trim(),
        percentual: Number(s.percentual.toFixed(2)),
      })),
      parametros: dados.parametros ? { ...dados.parametros } : {},
      criadoEm: new Date(),
    };

    return this.repo.salvar(opcao);
  }

  /**
   * Lista todo o histórico de opções de regime tributário da empresa (CA-2)
   */
  public async listarHistorico(
    empresaId: string
  ): Promise<OpcaoRegimeTributario[]> {
    if (!empresaId?.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    return this.repo.listarPorEmpresa(empresaId.trim());
  }

  /**
   * Consulta a opção de regime tributário vigente na data informada (CA-2 e CA-3)
   */
  public async consultarVigente(
    empresaId: string,
    dataReferencia: string
  ): Promise<OpcaoRegimeTributario> {
    if (!empresaId?.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    if (!dataReferencia) {
      throw new Error('A data de referência é obrigatória.');
    }
    this.validarDataISO(dataReferencia, 'data');

    const historico = await this.repo.listarPorEmpresa(empresaId.trim());
    const vigentes = historico.filter(
      (o) =>
        o.vigenciaInicio <= dataReferencia &&
        (!o.vigenciaFim || dataReferencia <= o.vigenciaFim)
    );

    if (vigentes.length === 0) {
      const erro = new Error(
        `Nenhuma opção de regime tributário vigente encontrada para a data ${dataReferencia}.`
      ) as Error & { statusCode?: number };
      erro.statusCode = 404;
      throw erro;
    }

    // Retorna a opção mais recente cuja vigência engloba a data consultada
    return vigentes[vigentes.length - 1];
  }
}
