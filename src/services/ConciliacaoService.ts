import * as crypto from 'crypto';
import {
  ExtratoBancario,
  ItemComparativoConciliacao,
  ItemExtratoBancario,
  OrigemVinculoConciliacao,
  ResultadoConciliacaoSaldos,
  SugestaoConciliacao,
  TipoMovimentoExtrato,
} from '../models/ConciliacaoModel';
import { IBaixaTituloRepository } from '../repositories/BaixaTituloRepository';
import { IConciliacaoRepository } from '../repositories/ConciliacaoRepository';
import { ILancamentoContabilRepository } from '../repositories/LancamentoContabilRepository';
import { IPlanoContasRepository } from '../repositories/PlanoContasRepository';
import { ITituloFinanceiroRepository } from '../repositories/TituloFinanceiroRepository';

/**
 * Serviço de Conciliação Contábil e Bancária (SPEC-2.11 / RF-011, RF-048)
 */
export class ConciliacaoService {
  constructor(
    private readonly conciliacaoRepo: IConciliacaoRepository,
    private readonly lancamentoRepo: ILancamentoContabilRepository,
    private readonly planoContasRepo: IPlanoContasRepository,
    private readonly tituloRepo: ITituloFinanceiroRepository,
    private readonly baixaRepo: IBaixaTituloRepository
  ) {}

  private arredondar(valor: number): number {
    return Number(valor.toFixed(2));
  }

  private diferencaDias(dataA: string, dataB: string): number {
    const tA = new Date(dataA).getTime();
    const tB = new Date(dataB).getTime();
    return Math.abs(tA - tB) / (1000 * 60 * 60 * 24);
  }

  // ============================================================================
  // CA-1 e CA-4: Importação de Extrato Bancário e Sugestão Automática
  // ============================================================================

  /**
   * Importa extrato bancário e gera sugestões de conciliação com lançamentos e baixas
   */
  public async importarExtrato(dados: {
    empresaId: string;
    contaBancariaCodigo: string;
    contaContabilId?: string;
    saldoInicial?: number;
    saldoFinal?: number;
    itens: Array<{
      data: string;
      historico: string;
      tipo: TipoMovimentoExtrato;
      valor: number;
    }>;
  }): Promise<ExtratoBancario> {
    const empresaId = (dados.empresaId || '').trim();
    const contaBancariaCodigo = (dados.contaBancariaCodigo || '').trim();
    if (!empresaId || !contaBancariaCodigo) {
      throw new Error(
        'O identificador da empresa e o código da conta bancária são obrigatórios.'
      );
    }
    if (!Array.isArray(dados.itens) || dados.itens.length === 0) {
      throw new Error('O extrato deve possuir ao menos um item de movimentação.');
    }

    const [lancamentos, baixas] = await Promise.all([
      this.lancamentoRepo.listarPorEmpresa(empresaId),
      this.baixaRepo.listarPorEmpresa(empresaId),
    ]);

    const extratoId = crypto.randomUUID();
    const saldoInicial = this.arredondar(dados.saldoInicial ?? 0);
    let saldoCalculado = saldoInicial;

    const itensProcessados: ItemExtratoBancario[] = dados.itens.map(
      (item, idx) => {
        if (!item.data || !/^\d{4}-\d{2}-\d{2}$/.test(item.data)) {
          throw new Error(
            `O item ${idx + 1} do extrato deve informar data no formato YYYY-MM-DD.`
          );
        }
        if (item.tipo !== 'CREDITO' && item.tipo !== 'DEBITO') {
          throw new Error(
            `Tipo de movimento inválido no item ${idx + 1}: utilize CREDITO ou DEBITO.`
          );
        }
        if (
          typeof item.valor !== 'number' ||
          Number.isNaN(item.valor) ||
          item.valor <= 0
        ) {
          throw new Error(
            `O valor do item ${idx + 1} do extrato deve ser maior que zero.`
          );
        }

        const valor = this.arredondar(item.valor);
        saldoCalculado += item.tipo === 'CREDITO' ? valor : -valor;

        const sugestoes: SugestaoConciliacao[] = [];

        // Sugestões em lançamentos contábeis por valor e proximidade de data (<= 3 dias)
        for (const lanc of lancamentos) {
          if (this.diferencaDias(lanc.dataLancamento, item.data) > 3) continue;

          if (dados.contaContabilId) {
            const tipoPartidaEsperado =
              item.tipo === 'CREDITO' ? 'DEBITO' : 'CREDITO';
            const partidaCompativel = lanc.partidas.find(
              (p) =>
                p.contaId === dados.contaContabilId &&
                p.tipo === tipoPartidaEsperado &&
                Math.abs(p.valor - valor) <= 0.01
            );
            if (partidaCompativel) {
              sugestoes.push({
                origemTipo: 'LANCAMENTO',
                origemId: lanc.id,
                descricao: lanc.historico,
                data: lanc.dataLancamento,
                valor: partidaCompativel.valor,
              });
            }
          } else if (Math.abs(lanc.valorTotal - valor) <= 0.01) {
            sugestoes.push({
              origemTipo: 'LANCAMENTO',
              origemId: lanc.id,
              descricao: lanc.historico,
              data: lanc.dataLancamento,
              valor: lanc.valorTotal,
            });
          }
        }

        // Sugestões em baixas ativas por valor líquido e proximidade de data
        for (const baixa of baixas) {
          if (baixa.estornada) continue;
          if (
            Math.abs(baixa.valorLiquido - valor) <= 0.01 &&
            this.diferencaDias(baixa.dataBaixa, item.data) <= 3
          ) {
            sugestoes.push({
              origemTipo: 'BAIXA',
              origemId: baixa.id,
              descricao: `${baixa.tipoOperacao} parcela ${baixa.numeroParcela}`,
              data: baixa.dataBaixa,
              valor: baixa.valorLiquido,
            });
          }
        }

        return {
          id: crypto.randomUUID(),
          extratoId,
          empresaId,
          data: item.data,
          historico: (item.historico || '').trim() || 'Movimento bancário',
          tipo: item.tipo,
          valor,
          status: sugestoes.length > 0 ? 'SUGERIDA' : 'PENDENTE',
          sugestoes,
        };
      }
    );

    const extrato: ExtratoBancario = {
      id: extratoId,
      empresaId,
      contaBancariaCodigo,
      contaContabilId: dados.contaContabilId,
      saldoInicial,
      saldoFinal:
        dados.saldoFinal !== undefined
          ? this.arredondar(dados.saldoFinal)
          : this.arredondar(saldoCalculado),
      itens: itensProcessados,
      importadoEm: new Date(),
    };

    return this.conciliacaoRepo.salvarExtrato(extrato);
  }

  public async listarExtratos(empresaId: string): Promise<ExtratoBancario[]> {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    return this.conciliacaoRepo.listarExtratosPorEmpresa(empresaId);
  }

  // ============================================================================
  // CA-2 e CA-4: Confirmação Manual de Conciliação
  // ============================================================================

  /**
   * Confirma manualmente a conciliação de um item do extrato bancário
   */
  public async confirmarManualmente(
    empresaId: string,
    itemId: string,
    dados: {
      origemTipo: OrigemVinculoConciliacao;
      origemId: string;
      confirmadoPor: string;
    }
  ): Promise<ItemExtratoBancario> {
    const item = await this.conciliacaoRepo.buscarItemPorId(itemId);
    if (!item || item.empresaId !== empresaId) {
      throw new Error('Item de extrato não encontrado para esta empresa.');
    }
    if (item.status === 'CONCILIADA') {
      throw new Error('Este item de extrato já foi conciliado.');
    }
    if (!dados.origemTipo || !dados.origemId?.trim() || !dados.confirmadoPor?.trim()) {
      throw new Error(
        'origemTipo, origemId e confirmadoPor são obrigatórios para confirmação manual.'
      );
    }

    item.status = 'CONCILIADA';
    item.vinculoConfirmado = {
      origemTipo: dados.origemTipo,
      origemId: dados.origemId.trim(),
      confirmadoPor: dados.confirmadoPor.trim(),
      confirmadoEm: new Date(),
    };

    return this.conciliacaoRepo.atualizarItem(item);
  }

  // ============================================================================
  // CA-3 e CA-4: Conciliação de Saldos Contábeis com Extrato e Módulos
  // ============================================================================

  /**
   * Concilia saldos contábeis da competência com extrato bancário, pagar/receber,
   * folha e módulos fiscais
   */
  public async conciliarSaldos(
    empresaId: string,
    dados: {
      competencia: string;
      saldoExtratoInformado?: number;
      saldoFolhaInformado?: number;
      saldoFiscalInformado?: number;
    }
  ): Promise<ResultadoConciliacaoSaldos> {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    if (!dados.competencia || !/^\d{4}-\d{2}$/.test(dados.competencia)) {
      throw new Error('A competência deve ser informada no formato YYYY-MM.');
    }

    const [contas, lancamentos, extratos, titulos, baixas] = await Promise.all([
      this.planoContasRepo.listarPorEmpresa(empresaId),
      this.lancamentoRepo.listarPorEmpresa(empresaId),
      this.conciliacaoRepo.listarExtratosPorEmpresa(empresaId),
      this.tituloRepo.listarPorEmpresa(empresaId),
      this.baixaRepo.listarPorEmpresa(empresaId),
    ]);

    // Acumula saldo contábil até a competência por conta
    const saldosContas = new Map<string, number>();
    const mapaContas = new Map(contas.map((c) => [c.id, c]));

    for (const lanc of lancamentos) {
      if (lanc.competencia > dados.competencia) continue;
      for (const p of lanc.partidas) {
        const conta = mapaContas.get(p.contaId);
        if (!conta) continue;
        const atual = saldosContas.get(conta.id) || 0;
        const delta =
          conta.natureza === 'DEVEDORA'
            ? p.tipo === 'DEBITO'
              ? p.valor
              : -p.valor
            : p.tipo === 'CREDITO'
              ? p.valor
              : -p.valor;
        saldosContas.set(conta.id, atual + delta);
      }
    }

    const somarGrupo = (predicado: (codigo: string, nome: string, classif: string) => boolean) => {
      let total = 0;
      for (const conta of contas) {
        if (predicado(conta.codigo, conta.nome, conta.classificacao)) {
          total += saldosContas.get(conta.id) || 0;
        }
      }
      return this.arredondar(total);
    };

    const saldoContabilBancario = somarGrupo(
      (cod, nome, classif) =>
        classif === 'ATIVO' &&
        (cod.startsWith('1.1.01') || /(caixa|banco|disponibilidade)/i.test(nome))
    );
    const saldoContabilPagar = somarGrupo(
      (cod, nome, classif) =>
        classif === 'PASSIVO' &&
        (cod.startsWith('2.1.01') || /(fornecedor|contas a pagar)/i.test(nome))
    );
    const saldoContabilReceber = somarGrupo(
      (cod, nome, classif) =>
        classif === 'ATIVO' &&
        (cod.startsWith('1.1.02') || /(cliente|contas a receber)/i.test(nome))
    );
    const saldoContabilFolha = somarGrupo(
      (_cod, nome, classif) =>
        classif === 'PASSIVO' && /(folha|sal[aá]rio|encargo)/i.test(nome)
    );
    const saldoContabilFiscal = somarGrupo(
      (_cod, nome, classif) =>
        classif === 'PASSIVO' && /(tributo|imposto|fiscal|icms|iss|pis|cofins)/i.test(nome)
    );

    // Saldo em aberto dos módulos de títulos a pagar e a receber
    let saldoModuloPagar = 0;
    let saldoModuloReceber = 0;
    for (const titulo of titulos) {
      for (const parcela of titulo.parcelas) {
        let baixado = 0;
        for (const b of baixas) {
          if (
            !b.estornada &&
            b.tituloId === titulo.id &&
            b.numeroParcela === parcela.numero
          ) {
            baixado += b.principalBaixado;
          }
        }
        const aberto = Math.max(0, parcela.valor - baixado);
        if (titulo.tipo === 'PAGAR') saldoModuloPagar += aberto;
        else saldoModuloReceber += aberto;
      }
    }

    const saldoExtrato =
      dados.saldoExtratoInformado !== undefined
        ? this.arredondar(dados.saldoExtratoInformado)
        : extratos.length > 0
          ? extratos[extratos.length - 1].saldoFinal
          : 0;

    const criarComparativo = (
      modulo: ItemComparativoConciliacao['modulo'],
      saldoContabil: number,
      saldoModulo: number
    ): ItemComparativoConciliacao => {
      const dif = this.arredondar(saldoContabil - saldoModulo);
      return {
        modulo,
        saldoContabil: this.arredondar(saldoContabil),
        saldoModulo: this.arredondar(saldoModulo),
        diferenca: dif,
        conciliado: Math.abs(dif) <= 0.01,
      };
    };

    const comparativos: ItemComparativoConciliacao[] = [
      criarComparativo('BANCARIO', saldoContabilBancario, saldoExtrato),
      criarComparativo('CONTAS_PAGAR', saldoContabilPagar, saldoModuloPagar),
      criarComparativo('CONTAS_RECEBER', saldoContabilReceber, saldoModuloReceber),
      criarComparativo(
        'FOLHA',
        saldoContabilFolha,
        dados.saldoFolhaInformado ?? 0
      ),
      criarComparativo(
        'FISCAL',
        saldoContabilFiscal,
        dados.saldoFiscalInformado ?? 0
      ),
    ];

    return {
      empresaId,
      competencia: dados.competencia,
      comparativos,
      tudoConciliado: comparativos.every((c) => c.conciliado),
    };
  }
}
