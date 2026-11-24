import { ContaContabil, NaturezaConta } from '../models/ContaContabil';
import { LancamentoContabil } from '../models/LancamentoContabil';
import {
  BalanceteVerificacao,
  ItemBalanceteConta,
  ItemRelatorioAuxiliar,
  LancamentoLivroDiario,
  LivroDiario,
  LivroRazao,
  MovimentoLivroRazao,
  RelatorioAuxiliarContabil,
} from '../models/RelatorioContabilModel';
import { ILancamentoContabilRepository } from '../repositories/LancamentoContabilRepository';
import { IPlanoContasRepository } from '../repositories/PlanoContasRepository';

/**
 * Serviço para geração de Balancete, Razão, Diário e Relatório Auxiliar (SPEC-2.7 / RF-013)
 */
export class RelatorioContabilService {
  constructor(
    private readonly lancamentoRepo: ILancamentoContabilRepository,
    private readonly planoContasRepo: IPlanoContasRepository
  ) {}

  /**
   * Valida empresaId e competência (YYYY-MM) obrigatórios para consulta (CA-4)
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

  /**
   * Calcula saldo líquido respeitando a natureza contábil da conta
   */
  private calcularSaldo(
    natureza: NaturezaConta,
    debitos: number,
    creditos: number
  ): number {
    const bruto = natureza === 'DEVEDORA' ? debitos - creditos : creditos - debitos;
    return this.arredondar(bruto);
  }

  /**
   * Ordena lançamentos em ordem cronológica crescente (dataLancamento e id)
   */
  private ordenarCronologicamente(
    lancamentos: LancamentoContabil[]
  ): LancamentoContabil[] {
    return [...lancamentos].sort(
      (a, b) =>
        a.dataLancamento.localeCompare(b.dataLancamento) || a.id.localeCompare(b.id)
    );
  }

  private async carregarMapaContas(
    empresaId: string
  ): Promise<Map<string, ContaContabil>> {
    const contas = await this.planoContasRepo.listarPorEmpresa(empresaId);
    const mapa = new Map<string, ContaContabil>();
    for (const conta of contas) {
      mapa.set(conta.id, conta);
    }
    return mapa;
  }

  // ============================================================================
  // CA-1: Balancete de Verificação
  // ============================================================================

  /**
   * Gera o Balancete de Verificação da empresa para a competência informada
   */
  public async gerarBalancete(
    empresaId: string,
    competencia: string
  ): Promise<BalanceteVerificacao> {
    this.validarParametrosBasicos(empresaId, competencia);

    const [mapaContas, lancamentos] = await Promise.all([
      this.carregarMapaContas(empresaId),
      this.lancamentoRepo.listarPorEmpresa(empresaId),
    ]);

    const acumulador = new Map<
      string,
      { debAnt: number; credAnt: number; debPer: number; credPer: number }
    >();

    const obterRegistro = (contaId: string) => {
      if (!acumulador.has(contaId)) {
        acumulador.set(contaId, {
          debAnt: 0,
          credAnt: 0,
          debPer: 0,
          credPer: 0,
        });
      }
      return acumulador.get(contaId)!;
    };

    for (const lanc of lancamentos) {
      if (lanc.competencia > competencia) {
        continue;
      }
      const ehPeriodoAtual = lanc.competencia === competencia;

      for (const partida of lanc.partidas) {
        const reg = obterRegistro(partida.contaId);
        if (ehPeriodoAtual) {
          if (partida.tipo === 'DEBITO') reg.debPer += partida.valor;
          else reg.credPer += partida.valor;
        } else {
          if (partida.tipo === 'DEBITO') reg.debAnt += partida.valor;
          else reg.credAnt += partida.valor;
        }
      }
    }

    const itens: ItemBalanceteConta[] = [];
    let totalDebitosGeral = 0;
    let totalCreditosGeral = 0;

    for (const [contaId, valores] of acumulador.entries()) {
      const conta = mapaContas.get(contaId);
      const natureza: NaturezaConta = conta?.natureza || 'DEVEDORA';

      const saldoAnterior = this.calcularSaldo(
        natureza,
        valores.debAnt,
        valores.credAnt
      );
      const totalDebitos = this.arredondar(valores.debPer);
      const totalCreditos = this.arredondar(valores.credPer);
      const saldoFinal = this.calcularSaldo(
        natureza,
        valores.debAnt + valores.debPer,
        valores.credAnt + valores.credPer
      );

      totalDebitosGeral += totalDebitos;
      totalCreditosGeral += totalCreditos;

      itens.push({
        contaId,
        codigo: conta?.codigo || contaId,
        nome: conta?.nome || 'Conta não catalogada',
        natureza,
        saldoAnterior,
        totalDebitos,
        totalCreditos,
        saldoFinal,
      });
    }

    itens.sort((a, b) => a.codigo.localeCompare(b.codigo));

    return {
      empresaId,
      competencia,
      contas: itens,
      totalDebitos: this.arredondar(totalDebitosGeral),
      totalCreditos: this.arredondar(totalCreditosGeral),
    };
  }

  // ============================================================================
  // CA-2: Livro Razão
  // ============================================================================

  /**
   * Gera o Livro Razão de uma conta contábil na competência informada
   */
  public async gerarRazao(
    empresaId: string,
    contaId: string,
    competencia: string
  ): Promise<LivroRazao> {
    this.validarParametrosBasicos(empresaId, competencia);
    if (!contaId || !contaId.trim()) {
      throw new Error('O identificador da conta contábil é obrigatório.');
    }

    const conta = await this.planoContasRepo.buscarPorId(contaId);
    if (!conta || conta.empresaId !== empresaId) {
      throw new Error('Conta contábil não encontrada para esta empresa.');
    }

    const lancamentos = this.ordenarCronologicamente(
      await this.lancamentoRepo.listarPorEmpresa(empresaId)
    );

    let debAnt = 0;
    let credAnt = 0;
    const lancamentosPeriodo: LancamentoContabil[] = [];

    for (const lanc of lancamentos) {
      if (lanc.competencia < competencia) {
        for (const p of lanc.partidas) {
          if (p.contaId === contaId) {
            if (p.tipo === 'DEBITO') debAnt += p.valor;
            else credAnt += p.valor;
          }
        }
      } else if (lanc.competencia === competencia) {
        lancamentosPeriodo.push(lanc);
      }
    }

    const saldoAnterior = this.calcularSaldo(conta.natureza, debAnt, credAnt);
    let saldoCorrente = saldoAnterior;
    let totalDebitos = 0;
    let totalCreditos = 0;
    const movimentos: MovimentoLivroRazao[] = [];

    for (const lanc of lancamentosPeriodo) {
      for (const partida of lanc.partidas) {
        if (partida.contaId !== contaId) continue;

        const debito = partida.tipo === 'DEBITO' ? this.arredondar(partida.valor) : 0;
        const credito = partida.tipo === 'CREDITO' ? this.arredondar(partida.valor) : 0;

        totalDebitos += debito;
        totalCreditos += credito;

        // Atualiza saldo acumulado conforme a natureza da conta
        const variacao =
          conta.natureza === 'DEVEDORA' ? debito - credito : credito - debito;
        saldoCorrente = this.arredondar(saldoCorrente + variacao);

        movimentos.push({
          lancamentoId: lanc.id,
          dataLancamento: lanc.dataLancamento,
          competencia: lanc.competencia,
          historico: lanc.historico,
          documentoOrigem: lanc.documentoOrigem,
          tipoPartida: partida.tipo,
          debito,
          credito,
          saldoAcumulado: saldoCorrente,
        });
      }
    }

    return {
      empresaId,
      competencia,
      conta: {
        id: conta.id,
        codigo: conta.codigo,
        nome: conta.nome,
        natureza: conta.natureza,
      },
      saldoAnterior,
      movimentos,
      totalDebitos: this.arredondar(totalDebitos),
      totalCreditos: this.arredondar(totalCreditos),
      saldoFinal: this.arredondar(saldoCorrente),
    };
  }

  // ============================================================================
  // CA-3: Livro Diário
  // ============================================================================

  /**
   * Gera o Livro Diário cronológico da empresa para a competência informada
   */
  public async gerarDiario(
    empresaId: string,
    competencia: string
  ): Promise<LivroDiario> {
    this.validarParametrosBasicos(empresaId, competencia);

    const [mapaContas, todosLancamentos] = await Promise.all([
      this.carregarMapaContas(empresaId),
      this.lancamentoRepo.listarPorEmpresa(empresaId),
    ]);

    const lancamentosPeriodo = this.ordenarCronologicamente(
      todosLancamentos.filter((l) => l.competencia === competencia)
    );

    let totalDebitos = 0;
    let totalCreditos = 0;

    const lancamentosDiario: LancamentoLivroDiario[] = lancamentosPeriodo.map(
      (lanc) => {
        const partidas = lanc.partidas.map((p) => {
          const conta = mapaContas.get(p.contaId);
          if (p.tipo === 'DEBITO') totalDebitos += p.valor;
          else totalCreditos += p.valor;

          return {
            contaId: p.contaId,
            codigoConta: conta?.codigo || p.contaId,
            nomeConta: conta?.nome || 'Conta não catalogada',
            tipo: p.tipo,
            valor: this.arredondar(p.valor),
            centroCustoId: p.centroCustoId || lanc.centroCustoId,
          };
        });

        return {
          lancamentoId: lanc.id,
          dataLancamento: lanc.dataLancamento,
          competencia: lanc.competencia,
          historico: lanc.historico,
          documentoOrigem: lanc.documentoOrigem,
          valorTotal: this.arredondar(lanc.valorTotal),
          partidas,
        };
      }
    );

    return {
      empresaId,
      competencia,
      lancamentos: lancamentosDiario,
      totalDebitos: this.arredondar(totalDebitos),
      totalCreditos: this.arredondar(totalCreditos),
    };
  }

  // ============================================================================
  // CA-4: Livro / Relatório Auxiliar
  // ============================================================================

  /**
   * Gera o relatório auxiliar consolidando quantidade de partidas e movimentação por conta
   */
  public async gerarRelatorioAuxiliar(
    empresaId: string,
    competencia: string
  ): Promise<RelatorioAuxiliarContabil> {
    this.validarParametrosBasicos(empresaId, competencia);

    const [mapaContas, todosLancamentos] = await Promise.all([
      this.carregarMapaContas(empresaId),
      this.lancamentoRepo.listarPorEmpresa(empresaId),
    ]);

    const lancamentosPeriodo = todosLancamentos.filter(
      (l) => l.competencia === competencia
    );

    const acumulador = new Map<
      string,
      { quantidadePartidas: number; totalDebitos: number; totalCreditos: number }
    >();

    let totalDebitosGeral = 0;
    let totalCreditosGeral = 0;

    for (const lanc of lancamentosPeriodo) {
      for (const partida of lanc.partidas) {
        if (!acumulador.has(partida.contaId)) {
          acumulador.set(partida.contaId, {
            quantidadePartidas: 0,
            totalDebitos: 0,
            totalCreditos: 0,
          });
        }
        const reg = acumulador.get(partida.contaId)!;
        reg.quantidadePartidas += 1;
        if (partida.tipo === 'DEBITO') {
          reg.totalDebitos += partida.valor;
          totalDebitosGeral += partida.valor;
        } else {
          reg.totalCreditos += partida.valor;
          totalCreditosGeral += partida.valor;
        }
      }
    }

    const itens: ItemRelatorioAuxiliar[] = [];
    for (const [contaId, valores] of acumulador.entries()) {
      const conta = mapaContas.get(contaId);
      const natureza: NaturezaConta = conta?.natureza || 'DEVEDORA';
      const totalDebitos = this.arredondar(valores.totalDebitos);
      const totalCreditos = this.arredondar(valores.totalCreditos);

      itens.push({
        contaId,
        codigoConta: conta?.codigo || contaId,
        nomeConta: conta?.nome || 'Conta não catalogada',
        quantidadePartidas: valores.quantidadePartidas,
        totalDebitos,
        totalCreditos,
        saldoMovimento: this.calcularSaldo(natureza, totalDebitos, totalCreditos),
      });
    }

    itens.sort((a, b) => a.codigoConta.localeCompare(b.codigoConta));

    return {
      empresaId,
      competencia,
      itens,
      totalDebitos: this.arredondar(totalDebitosGeral),
      totalCreditos: this.arredondar(totalCreditosGeral),
    };
  }
}
