import { ContaContabil, NaturezaConta } from '../models/ContaContabil';
import {
  BalancoPatrimonial,
  ContaSaldoDemonstracao,
  DemonstracaoFluxosCaixa,
  DemonstracaoMutacoesPL,
  DemonstracaoResultadoExercicio,
  MovimentoFluxoCaixa,
} from '../models/DemonstracaoContabilModel';
import { LancamentoContabil } from '../models/LancamentoContabil';
import { ILancamentoContabilRepository } from '../repositories/LancamentoContabilRepository';
import { IPlanoContasRepository } from '../repositories/PlanoContasRepository';

/**
 * Serviço exclusivamente de leitura para geração de Balanço Patrimonial,
 * DRE, DFC e DMPL/DLPA a partir dos lançamentos contábeis (SPEC-2.8 / RF-013 parte 2)
 */
export class DemonstracaoContabilService {
  constructor(
    private readonly lancamentoRepo: ILancamentoContabilRepository,
    private readonly planoContasRepo: IPlanoContasRepository
  ) {}

  /**
   * Valida empresaId e competência no formato YYYY-MM (CA-4)
   */
  private validarParametrosBasicos(empresaId: string, competencia: string): void {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    if (!competencia || !/^\d{4}-\d{2}$/.test(competencia)) {
      throw new Error('A competência deve ser informada no formato YYYY-MM.');
    }
  }

  private arredondar(valor: number): number {
    return Number(valor.toFixed(2));
  }

  private calcularSaldoPorNatureza(
    natureza: NaturezaConta,
    debitos: number,
    creditos: number
  ): number {
    return this.arredondar(
      natureza === 'DEVEDORA' ? debitos - creditos : creditos - debitos
    );
  }

  /**
   * Identifica se a conta pertence ao grupo de caixa e equivalentes para a DFC
   */
  private ehContaDeCaixa(conta: ContaContabil): boolean {
    if (conta.classificacao !== 'ATIVO') return false;
    return (
      conta.codigo.startsWith('1.1.01') ||
      /(caixa|banco|disponibilidade|equivalente)/i.test(conta.nome)
    );
  }

  private async carregarDadosEmpresa(empresaId: string): Promise<{
    mapaContas: Map<string, ContaContabil>;
    lancamentos: LancamentoContabil[];
  }> {
    const [contas, lancamentos] = await Promise.all([
      this.planoContasRepo.listarPorEmpresa(empresaId),
      this.lancamentoRepo.listarPorEmpresa(empresaId),
    ]);
    const mapaContas = new Map<string, ContaContabil>();
    for (const c of contas) {
      mapaContas.set(c.id, c);
    }
    return { mapaContas, lancamentos };
  }

  /**
   * Acumula débitos e créditos por conta filtrando competência via predicado
   */
  private acumularPorConta(
    lancamentos: LancamentoContabil[],
    filtroCompetencia: (comp: string) => boolean
  ): Map<string, { debitos: number; creditos: number }> {
    const mapa = new Map<string, { debitos: number; creditos: number }>();
    for (const lanc of lancamentos) {
      if (!filtroCompetencia(lanc.competencia)) continue;
      for (const p of lanc.partidas) {
        if (!mapa.has(p.contaId)) {
          mapa.set(p.contaId, { debitos: 0, creditos: 0 });
        }
        const reg = mapa.get(p.contaId)!;
        if (p.tipo === 'DEBITO') reg.debitos += p.valor;
        else reg.creditos += p.valor;
      }
    }
    return mapa;
  }

  // ============================================================================
  // CA-1: Balanço Patrimonial
  // ============================================================================

  /**
   * Gera o Balanço Patrimonial acumulado até a competência informada
   */
  public async gerarBalancoPatrimonial(
    empresaId: string,
    competencia: string
  ): Promise<BalancoPatrimonial> {
    this.validarParametrosBasicos(empresaId, competencia);
    const { mapaContas, lancamentos } = await this.carregarDadosEmpresa(empresaId);

    const acumulados = this.acumularPorConta(
      lancamentos,
      (comp) => comp <= competencia
    );

    const contasAtivo: ContaSaldoDemonstracao[] = [];
    const contasPassivo: ContaSaldoDemonstracao[] = [];
    const contasPL: ContaSaldoDemonstracao[] = [];

    let totalAtivo = 0;
    let totalPassivo = 0;
    let totalPLSemResultado = 0;
    let totalReceitasAcum = 0;
    let totalDespesasAcum = 0;

    for (const [contaId, mov] of acumulados.entries()) {
      const conta = mapaContas.get(contaId);
      if (!conta) continue;

      const saldo = this.calcularSaldoPorNatureza(
        conta.natureza,
        mov.debitos,
        mov.creditos
      );

      if (conta.classificacao === 'ATIVO') {
        contasAtivo.push({
          contaId,
          codigo: conta.codigo,
          nome: conta.nome,
          saldo,
        });
        totalAtivo += saldo;
      } else if (conta.classificacao === 'PASSIVO') {
        contasPassivo.push({
          contaId,
          codigo: conta.codigo,
          nome: conta.nome,
          saldo,
        });
        totalPassivo += saldo;
      } else if (conta.classificacao === 'PATRIMONIO_LIQUIDO') {
        contasPL.push({
          contaId,
          codigo: conta.codigo,
          nome: conta.nome,
          saldo,
        });
        totalPLSemResultado += saldo;
      } else if (conta.classificacao === 'RECEITA') {
        totalReceitasAcum += saldo;
      } else if (conta.classificacao === 'DESPESA') {
        totalDespesasAcum += saldo;
      }
    }

    const ordenarCodigo = (a: ContaSaldoDemonstracao, b: ContaSaldoDemonstracao) =>
      a.codigo.localeCompare(b.codigo);

    contasAtivo.sort(ordenarCodigo);
    contasPassivo.sort(ordenarCodigo);
    contasPL.sort(ordenarCodigo);

    totalAtivo = this.arredondar(totalAtivo);
    totalPassivo = this.arredondar(totalPassivo);
    totalPLSemResultado = this.arredondar(totalPLSemResultado);
    const resultadoExercicio = this.arredondar(
      totalReceitasAcum - totalDespesasAcum
    );
    const totalPLAjustado = this.arredondar(
      totalPLSemResultado + resultadoExercicio
    );
    const totalPassivoEPatrimonioLiquido = this.arredondar(
      totalPassivo + totalPLAjustado
    );

    return {
      empresaId,
      competencia,
      ativo: { contas: contasAtivo, total: totalAtivo },
      passivo: { contas: contasPassivo, total: totalPassivo },
      patrimonioLiquido: {
        contas: contasPL,
        resultadoExercicio,
        totalSemResultado: totalPLSemResultado,
        totalAjustado: totalPLAjustado,
      },
      totalAtivo,
      totalPassivoEPatrimonioLiquido,
      equacaoPatrimonialFechada: totalAtivo === totalPassivoEPatrimonioLiquido,
    };
  }

  // ============================================================================
  // CA-2: Demonstração do Resultado do Exercício (DRE)
  // ============================================================================

  /**
   * Gera a DRE da competência informada consolidando Receitas e Despesas
   */
  public async gerarDRE(
    empresaId: string,
    competencia: string
  ): Promise<DemonstracaoResultadoExercicio> {
    this.validarParametrosBasicos(empresaId, competencia);
    const { mapaContas, lancamentos } = await this.carregarDadosEmpresa(empresaId);

    const movimentos = this.acumularPorConta(
      lancamentos,
      (comp) => comp === competencia
    );

    const contasReceita: ContaSaldoDemonstracao[] = [];
    const contasDespesa: ContaSaldoDemonstracao[] = [];
    let totalReceitas = 0;
    let totalDespesas = 0;

    for (const [contaId, mov] of movimentos.entries()) {
      const conta = mapaContas.get(contaId);
      if (!conta) continue;

      const saldo = this.calcularSaldoPorNatureza(
        conta.natureza,
        mov.debitos,
        mov.creditos
      );

      if (conta.classificacao === 'RECEITA') {
        contasReceita.push({
          contaId,
          codigo: conta.codigo,
          nome: conta.nome,
          saldo,
        });
        totalReceitas += saldo;
      } else if (conta.classificacao === 'DESPESA') {
        contasDespesa.push({
          contaId,
          codigo: conta.codigo,
          nome: conta.nome,
          saldo,
        });
        totalDespesas += saldo;
      }
    }

    contasReceita.sort((a, b) => a.codigo.localeCompare(b.codigo));
    contasDespesa.sort((a, b) => a.codigo.localeCompare(b.codigo));

    totalReceitas = this.arredondar(totalReceitas);
    totalDespesas = this.arredondar(totalDespesas);

    return {
      empresaId,
      competencia,
      receitas: { contas: contasReceita, total: totalReceitas },
      despesas: { contas: contasDespesa, total: totalDespesas },
      resultadoLiquido: this.arredondar(totalReceitas - totalDespesas),
    };
  }

  // ============================================================================
  // CA-3: Demonstração dos Fluxos de Caixa (DFC) - quando aplicável
  // ============================================================================

  /**
   * Gera a DFC da competência com base nas movimentações de contas de caixa/equivalentes
   */
  public async gerarDFC(
    empresaId: string,
    competencia: string
  ): Promise<DemonstracaoFluxosCaixa> {
    this.validarParametrosBasicos(empresaId, competencia);
    const { mapaContas, lancamentos } = await this.carregarDadosEmpresa(empresaId);

    const contasCaixaIds = new Set<string>();
    for (const conta of mapaContas.values()) {
      if (this.ehContaDeCaixa(conta)) {
        contasCaixaIds.add(conta.id);
      }
    }

    const lancamentosOrdenados = [...lancamentos]
      .filter((l) => l.competencia <= competencia)
      .sort(
        (a, b) =>
          a.dataLancamento.localeCompare(b.dataLancamento) || a.id.localeCompare(b.id)
      );

    let saldoInicial = 0;
    let entradas = 0;
    let saidas = 0;
    let houveMovimentoCaixa = false;
    const movimentos: MovimentoFluxoCaixa[] = [];

    for (const lanc of lancamentosOrdenados) {
      for (const partida of lanc.partidas) {
        if (!contasCaixaIds.has(partida.contaId)) continue;
        houveMovimentoCaixa = true;
        const conta = mapaContas.get(partida.contaId)!;

        if (lanc.competencia < competencia) {
          saldoInicial +=
            partida.tipo === 'DEBITO' ? partida.valor : -partida.valor;
        } else {
          if (partida.tipo === 'DEBITO') {
            entradas += partida.valor;
          } else {
            saidas += partida.valor;
          }
          movimentos.push({
            lancamentoId: lanc.id,
            dataLancamento: lanc.dataLancamento,
            historico: lanc.historico,
            contaCaixaCodigo: conta.codigo,
            contaCaixaNome: conta.nome,
            tipo: partida.tipo === 'DEBITO' ? 'ENTRADA' : 'SAIDA',
            valor: this.arredondar(partida.valor),
          });
        }
      }
    }

    if (contasCaixaIds.size === 0 || !houveMovimentoCaixa) {
      return {
        empresaId,
        competencia,
        aplicavel: false,
        motivoNaoAplicavel:
          'Não há contas de caixa/disponibilidades com movimentação até a competência informada.',
        saldoInicial: 0,
        entradas: 0,
        saidas: 0,
        variacaoLiquida: 0,
        saldoFinal: 0,
        movimentos: [],
      };
    }

    saldoInicial = this.arredondar(saldoInicial);
    entradas = this.arredondar(entradas);
    saidas = this.arredondar(saidas);
    const variacaoLiquida = this.arredondar(entradas - saidas);
    const saldoFinal = this.arredondar(saldoInicial + variacaoLiquida);

    return {
      empresaId,
      competencia,
      aplicavel: true,
      saldoInicial,
      entradas,
      saidas,
      variacaoLiquida,
      saldoFinal,
      movimentos,
    };
  }

  // ============================================================================
  // CA-3 e CA-4: Demonstração das Mutações do Patrimônio Líquido (DMPL/DLPA)
  // ============================================================================

  /**
   * Gera a DMPL/DLPA da competência integrando saldo inicial, mutações e resultado da DRE
   */
  public async gerarDMPL(
    empresaId: string,
    competencia: string
  ): Promise<DemonstracaoMutacoesPL> {
    this.validarParametrosBasicos(empresaId, competencia);
    const [{ mapaContas, lancamentos }, dre] = await Promise.all([
      this.carregarDadosEmpresa(empresaId),
      this.gerarDRE(empresaId, competencia),
    ]);

    const movAnteriores = this.acumularPorConta(
      lancamentos,
      (comp) => comp < competencia
    );
    const movPeriodo = this.acumularPorConta(
      lancamentos,
      (comp) => comp === competencia
    );

    let saldoInicialPL = 0;
    let resultadoAnterior = 0;
    let mutacoesNoPeriodo = 0;
    let possuiContaPL = false;
    const contasPL: ContaSaldoDemonstracao[] = [];

    for (const conta of mapaContas.values()) {
      if (conta.classificacao === 'PATRIMONIO_LIQUIDO') {
        possuiContaPL = true;
        const ant = movAnteriores.get(conta.id) || { debitos: 0, creditos: 0 };
        const per = movPeriodo.get(conta.id) || { debitos: 0, creditos: 0 };

        const saldoAntConta = this.calcularSaldoPorNatureza(
          conta.natureza,
          ant.debitos,
          ant.creditos
        );
        const mutacaoConta = this.calcularSaldoPorNatureza(
          conta.natureza,
          per.debitos,
          per.creditos
        );

        saldoInicialPL += saldoAntConta;
        mutacoesNoPeriodo += mutacaoConta;

        if (saldoAntConta !== 0 || mutacaoConta !== 0) {
          contasPL.push({
            contaId: conta.id,
            codigo: conta.codigo,
            nome: conta.nome,
            saldo: this.arredondar(saldoAntConta + mutacaoConta),
          });
        }
      } else if (conta.classificacao === 'RECEITA') {
        const ant = movAnteriores.get(conta.id);
        if (ant) {
          resultadoAnterior += this.calcularSaldoPorNatureza(
            conta.natureza,
            ant.debitos,
            ant.creditos
          );
        }
      } else if (conta.classificacao === 'DESPESA') {
        const ant = movAnteriores.get(conta.id);
        if (ant) {
          resultadoAnterior -= this.calcularSaldoPorNatureza(
            conta.natureza,
            ant.debitos,
            ant.creditos
          );
        }
      }
    }

    if (
      !possuiContaPL &&
      dre.resultadoLiquido === 0 &&
      resultadoAnterior === 0
    ) {
      return {
        empresaId,
        competencia,
        aplicavel: false,
        motivoNaoAplicavel:
          'Não há contas de patrimônio líquido ou resultado apurado para compor a DMPL/DLPA.',
        saldoInicial: 0,
        mutacoesNoPeriodo: 0,
        resultadoPeriodo: 0,
        saldoFinal: 0,
        contas: [],
      };
    }

    contasPL.sort((a, b) => a.codigo.localeCompare(b.codigo));

    const saldoInicial = this.arredondar(saldoInicialPL + resultadoAnterior);
    mutacoesNoPeriodo = this.arredondar(mutacoesNoPeriodo);
    const resultadoPeriodo = dre.resultadoLiquido;
    const saldoFinal = this.arredondar(
      saldoInicial + mutacoesNoPeriodo + resultadoPeriodo
    );

    return {
      empresaId,
      competencia,
      aplicavel: true,
      saldoInicial,
      mutacoesNoPeriodo,
      resultadoPeriodo,
      saldoFinal,
      contas: contasPL,
    };
  }
}
