import { BaixaTitulo } from '../models/BaixaTituloModel';
import {
  AgingRecebiveis,
  FaixaAging,
  FluxoCaixaFinanceiro,
  ItemFaixaAging,
  ItemPrevisaoPagamento,
  ItemRelatorioFinanceiroCentroCusto,
  PosicaoFinanceira,
  PrevisaoPagamentos,
  RelatorioFinanceiroCentroCusto,
} from '../models/RelatorioFinanceiroModel';
import { IBaixaTituloRepository } from '../repositories/BaixaTituloRepository';
import { ICentroCustoRepository } from '../repositories/CentroCustoRepository';
import { ITituloFinanceiroRepository } from '../repositories/TituloFinanceiroRepository';

/**
 * Serviço exclusivamente de leitura para Fluxo de Caixa, Posição Financeira,
 * Aging de Recebíveis, Previsão de Pagamentos e Relatório por Centro de Custo
 * (SPEC-2.12 / RF-049)
 */
export class RelatorioFinanceiroService {
  constructor(
    private readonly tituloRepo: ITituloFinanceiroRepository,
    private readonly baixaRepo: IBaixaTituloRepository,
    private readonly centroCustoRepo: ICentroCustoRepository
  ) {}

  private arredondar(valor: number): number {
    return Number(valor.toFixed(2));
  }

  private validarEmpresa(empresaId: string): void {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
  }

  private validarData(data: string, nomeCampo: string): void {
    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      throw new Error(
        `O parâmetro '${nomeCampo}' deve ser informado no formato YYYY-MM-DD.`
      );
    }
  }

  private validarIntervalo(dataInicio: string, dataFim: string): void {
    this.validarData(dataInicio, 'dataInicio');
    this.validarData(dataFim, 'dataFim');
    if (dataInicio > dataFim) {
      throw new Error('dataInicio não pode ser maior que dataFim.');
    }
  }

  private calcularBaixadoParcela(
    baixas: BaixaTitulo[],
    tituloId: string,
    numeroParcela: number
  ): number {
    let total = 0;
    for (const b of baixas) {
      if (
        !b.estornada &&
        b.tituloId === tituloId &&
        b.numeroParcela === numeroParcela
      ) {
        total += b.principalBaixado;
      }
    }
    return this.arredondar(total);
  }

  // ============================================================================
  // CA-1: Fluxo de Caixa e Posição Financeira
  // ============================================================================

  /**
   * Gera o Fluxo de Caixa (realizado + previsto) no intervalo de datas informado
   */
  public async gerarFluxoCaixa(
    empresaId: string,
    dataInicio: string,
    dataFim: string
  ): Promise<FluxoCaixaFinanceiro> {
    this.validarEmpresa(empresaId);
    this.validarIntervalo(dataInicio, dataFim);

    const [titulos, baixas] = await Promise.all([
      this.tituloRepo.listarPorEmpresa(empresaId),
      this.baixaRepo.listarPorEmpresa(empresaId),
    ]);

    let entradasRealizadas = 0;
    let saidasRealizadas = 0;
    for (const b of baixas) {
      if (b.estornada || b.dataBaixa < dataInicio || b.dataBaixa > dataFim) {
        continue;
      }
      if (b.tipoOperacao === 'RECEBIMENTO') entradasRealizadas += b.valorLiquido;
      else saidasRealizadas += b.valorLiquido;
    }

    let entradasPrevistas = 0;
    let saidasPrevistas = 0;
    for (const titulo of titulos) {
      for (const parcela of titulo.parcelas) {
        if (parcela.vencimento < dataInicio || parcela.vencimento > dataFim) {
          continue;
        }
        const baixado = this.calcularBaixadoParcela(
          baixas,
          titulo.id,
          parcela.numero
        );
        const aberto = Math.max(0, parcela.valor - baixado);
        if (aberto <= 0) continue;

        if (titulo.tipo === 'RECEBER') entradasPrevistas += aberto;
        else saidasPrevistas += aberto;
      }
    }

    const saldoRealizado = this.arredondar(entradasRealizadas - saidasRealizadas);
    const saldoPrevisto = this.arredondar(entradasPrevistas - saidasPrevistas);

    return {
      empresaId,
      dataInicio,
      dataFim,
      realizado: {
        entradas: this.arredondar(entradasRealizadas),
        saidas: this.arredondar(saidasRealizadas),
        saldoLiquido: saldoRealizado,
      },
      previsto: {
        entradas: this.arredondar(entradasPrevistas),
        saidas: this.arredondar(saidasPrevistas),
        saldoLiquido: saldoPrevisto,
      },
      saldoTotalProjetado: this.arredondar(saldoRealizado + saldoPrevisto),
    };
  }

  /**
   * Gera a Posição Financeira da empresa na data de referência
   */
  public async gerarPosicaoFinanceira(
    empresaId: string,
    dataReferencia: string
  ): Promise<PosicaoFinanceira> {
    this.validarEmpresa(empresaId);
    this.validarData(dataReferencia, 'dataReferencia');

    const [titulos, baixas] = await Promise.all([
      this.tituloRepo.listarPorEmpresa(empresaId),
      this.baixaRepo.listarPorEmpresa(empresaId),
    ]);

    let totalAReceberEmAberto = 0;
    let totalAPagarEmAberto = 0;

    for (const titulo of titulos) {
      for (const parcela of titulo.parcelas) {
        const baixado = this.calcularBaixadoParcela(
          baixas,
          titulo.id,
          parcela.numero
        );
        const aberto = Math.max(0, parcela.valor - baixado);
        if (titulo.tipo === 'RECEBER') totalAReceberEmAberto += aberto;
        else totalAPagarEmAberto += aberto;
      }
    }

    let totalRecebido = 0;
    let totalPago = 0;
    for (const b of baixas) {
      if (b.estornada || b.dataBaixa > dataReferencia) continue;
      if (b.tipoOperacao === 'RECEBIMENTO') totalRecebido += b.valorLiquido;
      else totalPago += b.valorLiquido;
    }

    totalAReceberEmAberto = this.arredondar(totalAReceberEmAberto);
    totalAPagarEmAberto = this.arredondar(totalAPagarEmAberto);
    totalRecebido = this.arredondar(totalRecebido);
    totalPago = this.arredondar(totalPago);

    return {
      empresaId,
      dataReferencia,
      totalAReceberEmAberto,
      totalAPagarEmAberto,
      saldoProjetado: this.arredondar(totalAReceberEmAberto - totalAPagarEmAberto),
      totalRecebido,
      totalPago,
      saldoRealizado: this.arredondar(totalRecebido - totalPago),
    };
  }

  // ============================================================================
  // CA-2: Aging de Recebíveis
  // ============================================================================

  /**
   * Gera o Aging de Recebíveis classificando parcelas a receber em aberto por faixa
   */
  public async gerarAgingRecebiveis(
    empresaId: string,
    dataReferencia: string
  ): Promise<AgingRecebiveis> {
    this.validarEmpresa(empresaId);
    this.validarData(dataReferencia, 'dataReferencia');

    const [titulos, baixas] = await Promise.all([
      this.tituloRepo.listarPorEmpresa(empresaId),
      this.baixaRepo.listarPorEmpresa(empresaId),
    ]);

    const ordemFaixas: FaixaAging[] = [
      'A_VENCER',
      '1_30_DIAS',
      '31_60_DIAS',
      '61_90_DIAS',
      'ACIMA_90_DIAS',
    ];
    const acumulador = new Map<FaixaAging, { qtd: number; valor: number }>();
    for (const f of ordemFaixas) {
      acumulador.set(f, { qtd: 0, valor: 0 });
    }

    let totalEmAberto = 0;
    const refTime = new Date(dataReferencia).getTime();

    for (const titulo of titulos) {
      if (titulo.tipo !== 'RECEBER') continue;
      for (const parcela of titulo.parcelas) {
        const baixado = this.calcularBaixadoParcela(
          baixas,
          titulo.id,
          parcela.numero
        );
        const aberto = this.arredondar(Math.max(0, parcela.valor - baixado));
        if (aberto <= 0) continue;

        const vencTime = new Date(parcela.vencimento).getTime();
        const diasAtraso = Math.floor(
          (refTime - vencTime) / (1000 * 60 * 60 * 24)
        );

        let faixa: FaixaAging = 'A_VENCER';
        if (diasAtraso >= 1 && diasAtraso <= 30) faixa = '1_30_DIAS';
        else if (diasAtraso >= 31 && diasAtraso <= 60) faixa = '31_60_DIAS';
        else if (diasAtraso >= 61 && diasAtraso <= 90) faixa = '61_90_DIAS';
        else if (diasAtraso > 90) faixa = 'ACIMA_90_DIAS';

        const reg = acumulador.get(faixa)!;
        reg.qtd += 1;
        reg.valor += aberto;
        totalEmAberto += aberto;
      }
    }

    const faixas: ItemFaixaAging[] = ordemFaixas.map((f) => ({
      faixa: f,
      quantidadeParcelas: acumulador.get(f)!.qtd,
      valorTotal: this.arredondar(acumulador.get(f)!.valor),
    }));

    return {
      empresaId,
      dataReferencia,
      faixas,
      totalEmAberto: this.arredondar(totalEmAberto),
    };
  }

  // ============================================================================
  // CA-3: Previsão de Pagamentos e Relatório por Centro de Custo
  // ============================================================================

  /**
   * Gera a Previsão de Pagamentos para o intervalo (filtrável por centro de custo)
   */
  public async gerarPrevisaoPagamentos(
    empresaId: string,
    dataInicio: string,
    dataFim: string,
    centroCustoId?: string
  ): Promise<PrevisaoPagamentos> {
    this.validarEmpresa(empresaId);
    this.validarIntervalo(dataInicio, dataFim);

    const [titulos, baixas] = await Promise.all([
      this.tituloRepo.listarPorEmpresa(empresaId),
      this.baixaRepo.listarPorEmpresa(empresaId),
    ]);

    const itens: ItemPrevisaoPagamento[] = [];
    let totalPrevisto = 0;

    for (const titulo of titulos) {
      if (titulo.tipo !== 'PAGAR') continue;
      if (centroCustoId && titulo.centroCustoId !== centroCustoId) continue;

      for (const parcela of titulo.parcelas) {
        if (parcela.vencimento < dataInicio || parcela.vencimento > dataFim) {
          continue;
        }
        const baixado = this.calcularBaixadoParcela(
          baixas,
          titulo.id,
          parcela.numero
        );
        const aberto = this.arredondar(Math.max(0, parcela.valor - baixado));
        if (aberto <= 0) continue;

        totalPrevisto += aberto;
        itens.push({
          tituloId: titulo.id,
          fornecedorNome: titulo.contraparte.nome,
          categoria: titulo.categoria,
          centroCustoId: titulo.centroCustoId,
          numeroParcela: parcela.numero,
          vencimento: parcela.vencimento,
          valorOriginal: parcela.valor,
          saldoEmAberto: aberto,
        });
      }
    }

    itens.sort((a, b) => a.vencimento.localeCompare(b.vencimento));

    return {
      empresaId,
      dataInicio,
      dataFim,
      centroCustoId,
      itens,
      totalPrevisto: this.arredondar(totalPrevisto),
    };
  }

  /**
   * Consolida totais financeiros (a pagar, a receber, realizados e em aberto) por centro de custo
   */
  public async gerarRelatorioPorCentroCusto(
    empresaId: string
  ): Promise<RelatorioFinanceiroCentroCusto> {
    this.validarEmpresa(empresaId);

    const [titulos, baixas, centros] = await Promise.all([
      this.tituloRepo.listarPorEmpresa(empresaId),
      this.baixaRepo.listarPorEmpresa(empresaId),
      this.centroCustoRepo.listarPorEmpresa(empresaId),
    ]);

    const mapaCentros = new Map(centros.map((c) => [c.id, c]));
    const acumulador = new Map<
      string,
      {
        totalPagar: number;
        totalReceber: number;
        totalPago: number;
        totalRecebido: number;
        abertoPagar: number;
        abertoReceber: number;
      }
    >();

    const obterReg = (ccId: string) => {
      if (!acumulador.has(ccId)) {
        acumulador.set(ccId, {
          totalPagar: 0,
          totalReceber: 0,
          totalPago: 0,
          totalRecebido: 0,
          abertoPagar: 0,
          abertoReceber: 0,
        });
      }
      return acumulador.get(ccId)!;
    };

    for (const titulo of titulos) {
      const ccKey = titulo.centroCustoId || 'SEM_CENTRO_CUSTO';
      const reg = obterReg(ccKey);

      if (titulo.tipo === 'PAGAR') reg.totalPagar += titulo.valorTotal;
      else reg.totalReceber += titulo.valorTotal;

      for (const parcela of titulo.parcelas) {
        const baixado = this.calcularBaixadoParcela(
          baixas,
          titulo.id,
          parcela.numero
        );
        const aberto = Math.max(0, parcela.valor - baixado);
        if (titulo.tipo === 'PAGAR') {
          reg.totalPago += baixado;
          reg.abertoPagar += aberto;
        } else {
          reg.totalRecebido += baixado;
          reg.abertoReceber += aberto;
        }
      }
    }

    const itens: ItemRelatorioFinanceiroCentroCusto[] = [];
    let totalAbertoPagar = 0;
    let totalAbertoReceber = 0;

    for (const [ccId, val] of acumulador.entries()) {
      const dim = mapaCentros.get(ccId);
      const abertoPagar = this.arredondar(val.abertoPagar);
      const abertoReceber = this.arredondar(val.abertoReceber);
      const totalPago = this.arredondar(val.totalPago);
      const totalRecebido = this.arredondar(val.totalRecebido);

      totalAbertoPagar += abertoPagar;
      totalAbertoReceber += abertoReceber;

      itens.push({
        centroCustoId: ccId,
        codigo: dim?.codigo || ccId,
        nome:
          dim?.nome ||
          (ccId === 'SEM_CENTRO_CUSTO'
            ? 'Sem centro de custo'
            : 'Centro não catalogado'),
        totalPagar: this.arredondar(val.totalPagar),
        totalReceber: this.arredondar(val.totalReceber),
        totalPago,
        totalRecebido,
        abertoPagar,
        abertoReceber,
        saldoLiquidoEmAberto: this.arredondar(abertoReceber - abertoPagar),
        saldoLiquidoRealizado: this.arredondar(totalRecebido - totalPago),
      });
    }

    itens.sort((a, b) => a.codigo.localeCompare(b.codigo));

    return {
      empresaId,
      itens,
      totalAbertoPagar: this.arredondar(totalAbertoPagar),
      totalAbertoReceber: this.arredondar(totalAbertoReceber),
    };
  }
}
