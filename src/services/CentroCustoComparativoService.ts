import * as crypto from 'crypto';
import {
  CentroCustoDimensao,
  ItemComparativoCentroCusto,
  RelatorioComparativoPeriodos,
  TipoDimensaoGerencial,
} from '../models/CentroCustoModel';
import { ICentroCustoRepository } from '../repositories/CentroCustoRepository';
import { ILancamentoContabilRepository } from '../repositories/LancamentoContabilRepository';

const TIPOS_DIMENSAO_PERMITIDOS: TipoDimensaoGerencial[] = [
  'CENTRO_CUSTO',
  'DEPARTAMENTO',
  'PROJETO',
  'UNIDADE',
];

/**
 * Serviço para gestão de Centros de Custo, Departamentos, Projetos, Unidades
 * e geração de comparativos entre dois períodos (SPEC-2.6 / RF-014)
 */
export class CentroCustoComparativoService {
  constructor(
    private readonly centroCustoRepo: ICentroCustoRepository,
    private readonly lancamentoRepo: ILancamentoContabilRepository
  ) {}

  // ============================================================================
  // CA-1 e CA-4: Cadastro e Consulta de Dimensões Gerenciais
  // ============================================================================

  /**
   * Cadastra um centro de custo, departamento, projeto ou unidade vinculado à empresa (CA-1 e CA-4)
   */
  public async cadastrarDimensao(dados: {
    id?: string;
    empresaId: string;
    codigo: string;
    nome: string;
    tipo: TipoDimensaoGerencial;
    ativo?: boolean;
  }): Promise<CentroCustoDimensao> {
    const empresaId = (dados.empresaId || '').trim();
    if (!empresaId) {
      throw new Error('O identificador da empresa é obrigatório.');
    }

    const codigo = (dados.codigo || '').trim();
    const nome = (dados.nome || '').trim();
    if (!codigo || !nome) {
      throw new Error('O código e o nome da dimensão gerencial são obrigatórios.');
    }

    if (!TIPOS_DIMENSAO_PERMITIDOS.includes(dados.tipo)) {
      throw new Error(
        `Tipo inválido. Valores permitidos: ${TIPOS_DIMENSAO_PERMITIDOS.join(', ')}.`
      );
    }

    // Bloqueia código duplicado na mesma empresa (CA-4)
    const existente = await this.centroCustoRepo.buscarPorEmpresaECodigo(
      empresaId,
      codigo
    );
    if (existente) {
      throw new Error(
        `Já existe uma dimensão gerencial com o código '${codigo}' cadastrada nesta empresa.`
      );
    }

    const novaDimensao: CentroCustoDimensao = {
      id: dados.id || crypto.randomUUID(),
      empresaId,
      codigo,
      nome,
      tipo: dados.tipo,
      ativo: dados.ativo ?? true,
      criadoEm: new Date(),
    };

    return this.centroCustoRepo.salvar(novaDimensao);
  }

  /**
   * Lista todas as dimensões gerenciais de uma empresa (filtrável opcionalmente por tipo) (CA-1)
   */
  public async listarPorEmpresa(
    empresaId: string,
    tipo?: TipoDimensaoGerencial
  ): Promise<CentroCustoDimensao[]> {
    const lista = await this.centroCustoRepo.listarPorEmpresa(empresaId);
    return tipo ? lista.filter((d) => d.tipo === tipo) : lista;
  }

  /**
   * Inativa uma dimensão gerencial
   */
  public async inativarDimensao(
    empresaId: string,
    id: string
  ): Promise<CentroCustoDimensao> {
    const dimensao = await this.centroCustoRepo.buscarPorId(id);
    if (!dimensao || dimensao.empresaId !== empresaId) {
      throw new Error('Centro de custo/dimensão não encontrado para esta empresa.');
    }
    dimensao.ativo = false;
    return this.centroCustoRepo.salvar(dimensao);
  }

  /**
   * Valida se um centro de custo existe, pertence à empresa e está ativo (CA-2 e CA-4)
   */
  public async validarCentroCustoAtivo(
    empresaId: string,
    centroCustoId: string
  ): Promise<CentroCustoDimensao> {
    const dimensao = await this.centroCustoRepo.buscarPorId(centroCustoId);
    if (!dimensao || dimensao.empresaId !== empresaId) {
      throw new Error(
        `Centro de custo '${centroCustoId}' não encontrado para a empresa.`
      );
    }
    if (!dimensao.ativo) {
      throw new Error(
        `Centro de custo '${dimensao.codigo} - ${dimensao.nome}' está inativo e não pode ser associado a lançamentos.`
      );
    }
    return dimensao;
  }

  // ============================================================================
  // CA-3 e CA-4: Relatório Comparativo entre Dois Períodos por Centro de Custo
  // ============================================================================

  /**
   * Gera comparativo consolidando débitos, créditos, saldo líquido e variações
   * entre duas competências (periodoBase vs. periodoComparado) (CA-3 e CA-4)
   */
  public async gerarComparativoPeriodos(
    empresaId: string,
    periodoBase: string,
    periodoComparado: string
  ): Promise<RelatorioComparativoPeriodos> {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    if (
      !periodoBase ||
      !/^\d{4}-\d{2}$/.test(periodoBase) ||
      !periodoComparado ||
      !/^\d{4}-\d{2}$/.test(periodoComparado)
    ) {
      throw new Error(
        'Os dois períodos (periodoBase e periodoComparado) devem ser informados no formato YYYY-MM.'
      );
    }

    const [dimensoes, lancamentosEmpresa] = await Promise.all([
      this.centroCustoRepo.listarPorEmpresa(empresaId),
      this.lancamentoRepo.listarPorEmpresa(empresaId),
    ]);

    const mapaDimensoes = new Map<string, CentroCustoDimensao>();
    for (const d of dimensoes) {
      mapaDimensoes.set(d.id, d);
    }

    // Estrutura acumuladora: centroCustoId -> totais nos dois períodos
    const acumulador = new Map<
      string,
      {
        debBase: number;
        credBase: number;
        debComp: number;
        credComp: number;
      }
    >();

    const adicionarValor = (
      ccId: string,
      ehBase: boolean,
      tipoPartida: 'DEBITO' | 'CREDITO',
      valor: number
    ) => {
      if (!acumulador.has(ccId)) {
        acumulador.set(ccId, { debBase: 0, credBase: 0, debComp: 0, credComp: 0 });
      }
      const reg = acumulador.get(ccId)!;
      if (ehBase) {
        if (tipoPartida === 'DEBITO') reg.debBase += valor;
        else reg.credBase += valor;
      } else {
        if (tipoPartida === 'DEBITO') reg.debComp += valor;
        else reg.credComp += valor;
      }
    };

    for (const lanc of lancamentosEmpresa) {
      if (lanc.competencia !== periodoBase && lanc.competencia !== periodoComparado) {
        continue;
      }
      const ehBase = lanc.competencia === periodoBase;

      for (const partida of lanc.partidas) {
        // Usa o centroCustoId da partida ou, se ausente, herda o do cabeçalho do lançamento
        const ccId = partida.centroCustoId || lanc.centroCustoId;
        if (ccId) {
          adicionarValor(ccId, ehBase, partida.tipo, partida.valor);
        }
      }
    }

    const itens: ItemComparativoCentroCusto[] = [];

    for (const [ccId, valores] of acumulador.entries()) {
      const dim = mapaDimensoes.get(ccId);
      const debBase = Number(valores.debBase.toFixed(2));
      const credBase = Number(valores.credBase.toFixed(2));
      const saldoBase = Number((debBase - credBase).toFixed(2));

      const debComp = Number(valores.debComp.toFixed(2));
      const credComp = Number(valores.credComp.toFixed(2));
      const saldoComp = Number((debComp - credComp).toFixed(2));

      const variacaoAbsolutaDebitos = Number((debComp - debBase).toFixed(2));
      const variacaoPercentualDebitos =
        debBase > 0
          ? Number((((debComp - debBase) / debBase) * 100).toFixed(2))
          : null;
      const variacaoAbsolutaSaldo = Number((saldoComp - saldoBase).toFixed(2));

      itens.push({
        centroCustoId: ccId,
        codigo: dim?.codigo || ccId,
        nome: dim?.nome || 'Dimensão não catalogada',
        tipo: dim?.tipo || 'NAO_IDENTIFICADO',
        periodoBase: {
          competencia: periodoBase,
          totalDebitos: debBase,
          totalCreditos: credBase,
          saldoLiquido: saldoBase,
        },
        periodoComparado: {
          competencia: periodoComparado,
          totalDebitos: debComp,
          totalCreditos: credComp,
          saldoLiquido: saldoComp,
        },
        variacaoAbsolutaDebitos,
        variacaoPercentualDebitos,
        variacaoAbsolutaSaldo,
      });
    }

    return {
      empresaId,
      periodoBase,
      periodoComparado,
      itens,
    };
  }
}
