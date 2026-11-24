import * as crypto from 'crypto';
import {
  CompensacaoTributaria,
  CreditoTributario,
  ItemVencimentoTributario,
  ParcelamentoTributario,
  ParcelaParcelamento,
  RetencaoTributaria,
  TipoRetencao,
} from '../models/RetencaoCreditoParcelamentoModel';
import { IRetencaoCreditoParcelamentoRepository } from '../repositories/RetencaoCreditoParcelamentoRepository';

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_COMPETENCIA = /^\d{4}-\d{2}$/;

/**
 * Serviço para controle de retenções, créditos, compensações, parcelamentos e vencimentos
 * (SPEC-3.8 / RF-022)
 */
export class RetencaoCreditoParcelamentoService {
  constructor(private readonly repo: IRetencaoCreditoParcelamentoRepository) {}

  private arredondar(valor: number): number {
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

  private validarValorPositivo(valor: number, campo: string): void {
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
      throw new Error(`${campo} deve ser maior que zero.`);
    }
  }

  private adicionarMesesISO(dataBase: string, meses: number): string {
    const [ano, mes, dia] = dataBase.split('-').map(Number);
    const dt = new Date(Date.UTC(ano, mes - 1 + meses, 1));
    const ultimoDiaMes = new Date(
      Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)
    ).getUTCDate();
    const diaAjustado = Math.min(dia, ultimoDiaMes);
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(diaAjustado).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private criarErro404(mensagem: string): Error {
    const erro = new Error(mensagem) as Error & { statusCode?: number };
    erro.statusCode = 404;
    return erro;
  }

  /**
   * Registra tributo retido ou sofrido (CA-1 e CA-4)
   */
  public async registrarRetencao(dados: {
    empresaId: string;
    tipo: TipoRetencao;
    tributo: string;
    competencia: string;
    dataVencimento: string;
    valor: number;
    documentoReferencia?: string;
  }): Promise<RetencaoTributaria> {
    if (!dados.empresaId?.trim() || !dados.tributo?.trim()) {
      throw new Error('empresaId e tributo são obrigatórios.');
    }
    if (dados.tipo !== 'RETIDO' && dados.tipo !== 'SOFRIDO') {
      throw new Error("tipo deve ser 'RETIDO' ou 'SOFRIDO'.");
    }
    if (!REGEX_COMPETENCIA.test(dados.competencia || '')) {
      throw new Error('competencia deve estar no formato YYYY-MM.');
    }
    this.validarDataISO(dados.dataVencimento, 'dataVencimento');
    this.validarValorPositivo(dados.valor, 'valor');

    const retencao: RetencaoTributaria = {
      id: crypto.randomUUID(),
      empresaId: dados.empresaId.trim(),
      tipo: dados.tipo,
      tributo: dados.tributo.trim().toUpperCase(),
      competencia: dados.competencia,
      dataVencimento: dados.dataVencimento,
      valor: this.arredondar(dados.valor),
      documentoReferencia: dados.documentoReferencia?.trim() || undefined,
      criadoEm: new Date(),
    };

    return this.repo.salvarRetencao(retencao);
  }

  public async listarRetencoes(
    empresaId: string,
    tipo?: TipoRetencao
  ): Promise<RetencaoTributaria[]> {
    if (!empresaId?.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    const lista = await this.repo.listarRetencoes(empresaId.trim());
    if (tipo) {
      return lista.filter((r) => r.tipo === tipo);
    }
    return lista;
  }

  /**
   * Registra crédito tributário (CA-2 e CA-4)
   */
  public async registrarCredito(dados: {
    empresaId: string;
    tributo: string;
    origem: string;
    dataApuracao: string;
    valorInicial: number;
  }): Promise<CreditoTributario> {
    if (
      !dados.empresaId?.trim() ||
      !dados.tributo?.trim() ||
      !dados.origem?.trim()
    ) {
      throw new Error('empresaId, tributo e origem são obrigatórios.');
    }
    this.validarDataISO(dados.dataApuracao, 'dataApuracao');
    this.validarValorPositivo(dados.valorInicial, 'valorInicial');

    const valor = this.arredondar(dados.valorInicial);
    const credito: CreditoTributario = {
      id: crypto.randomUUID(),
      empresaId: dados.empresaId.trim(),
      tributo: dados.tributo.trim().toUpperCase(),
      origem: dados.origem.trim(),
      dataApuracao: dados.dataApuracao,
      valorInicial: valor,
      saldoDisponivel: valor,
      criadoEm: new Date(),
    };

    return this.repo.salvarCredito(credito);
  }

  public async listarCreditos(empresaId: string): Promise<CreditoTributario[]> {
    if (!empresaId?.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    return this.repo.listarCreditos(empresaId.trim());
  }

  /**
   * Aplica compensação abatendo o saldo disponível do crédito (CA-2 e CA-4)
   */
  public async aplicarCompensacao(dados: {
    empresaId: string;
    creditoId: string;
    tributoDestino: string;
    valorCompensado: number;
    dataCompensacao: string;
  }): Promise<{
    compensacao: CompensacaoTributaria;
    creditoAtualizado: CreditoTributario;
  }> {
    if (
      !dados.empresaId?.trim() ||
      !dados.creditoId?.trim() ||
      !dados.tributoDestino?.trim()
    ) {
      throw new Error(
        'empresaId, creditoId e tributoDestino são obrigatórios.'
      );
    }
    this.validarDataISO(dados.dataCompensacao, 'dataCompensacao');
    this.validarValorPositivo(dados.valorCompensado, 'valorCompensado');

    const credito = await this.repo.buscarCreditoPorId(
      dados.empresaId.trim(),
      dados.creditoId.trim()
    );
    if (!credito) {
      throw this.criarErro404('Crédito tributário não encontrado.');
    }

    const valorCompensado = this.arredondar(dados.valorCompensado);
    if (valorCompensado > credito.saldoDisponivel) {
      throw new Error(
        `Saldo insuficiente para compensação (disponível: ${credito.saldoDisponivel.toFixed(2)}).`
      );
    }

    credito.saldoDisponivel = this.arredondar(
      credito.saldoDisponivel - valorCompensado
    );
    await this.repo.atualizarCredito(credito);

    const compensacao: CompensacaoTributaria = {
      id: crypto.randomUUID(),
      empresaId: dados.empresaId.trim(),
      creditoId: credito.id,
      tributoDestino: dados.tributoDestino.trim().toUpperCase(),
      valorCompensado,
      dataCompensacao: dados.dataCompensacao,
      criadoEm: new Date(),
    };
    await this.repo.salvarCompensacao(compensacao);

    return { compensacao, creditoAtualizado: credito };
  }

  /**
   * Cadastra parcelamento gerando parcelas e vencimentos mensais (CA-3 e CA-4)
   */
  public async cadastrarParcelamento(dados: {
    empresaId: string;
    tributo: string;
    valorTotal: number;
    quantidadeParcelas: number;
    primeiroVencimento: string;
  }): Promise<ParcelamentoTributario> {
    if (!dados.empresaId?.trim() || !dados.tributo?.trim()) {
      throw new Error('empresaId e tributo são obrigatórios.');
    }
    this.validarValorPositivo(dados.valorTotal, 'valorTotal');
    if (
      !Number.isInteger(dados.quantidadeParcelas) ||
      dados.quantidadeParcelas < 1
    ) {
      throw new Error(
        'quantidadeParcelas deve ser um número inteiro maior ou igual a 1.'
      );
    }
    this.validarDataISO(dados.primeiroVencimento, 'primeiroVencimento');

    const total = this.arredondar(dados.valorTotal);
    const valorBase = this.arredondar(total / dados.quantidadeParcelas);
    const parcelas: ParcelaParcelamento[] = [];
    let acumulado = 0;

    for (let i = 1; i <= dados.quantidadeParcelas; i++) {
      const valorParcela =
        i === dados.quantidadeParcelas
          ? this.arredondar(total - acumulado)
          : valorBase;
      acumulado = this.arredondar(acumulado + valorParcela);

      parcelas.push({
        numero: i,
        dataVencimento: this.adicionarMesesISO(
          dados.primeiroVencimento,
          i - 1
        ),
        valor: valorParcela,
        status: 'ABERTA',
      });
    }

    const parcelamento: ParcelamentoTributario = {
      id: crypto.randomUUID(),
      empresaId: dados.empresaId.trim(),
      tributo: dados.tributo.trim().toUpperCase(),
      valorTotal: total,
      quantidadeParcelas: dados.quantidadeParcelas,
      parcelas,
      criadoEm: new Date(),
    };

    return this.repo.salvarParcelamento(parcelamento);
  }

  public async listarParcelamentos(
    empresaId: string
  ): Promise<ParcelamentoTributario[]> {
    if (!empresaId?.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    return this.repo.listarParcelamentos(empresaId.trim());
  }

  /**
   * Registra pagamento de uma parcela de parcelamento (CA-3 e CA-4)
   */
  public async pagarParcela(dados: {
    empresaId: string;
    parcelamentoId: string;
    numero: number;
    dataPagamento: string;
  }): Promise<ParcelamentoTributario> {
    if (!dados.empresaId?.trim() || !dados.parcelamentoId?.trim()) {
      throw new Error('empresaId e parcelamentoId são obrigatórios.');
    }
    this.validarDataISO(dados.dataPagamento, 'dataPagamento');

    const parcelamento = await this.repo.buscarParcelamentoPorId(
      dados.empresaId.trim(),
      dados.parcelamentoId.trim()
    );
    if (!parcelamento) {
      throw this.criarErro404('Parcelamento não encontrado.');
    }

    const parcela = parcelamento.parcelas.find(
      (p) => p.numero === dados.numero
    );
    if (!parcela) {
      throw this.criarErro404('Parcela não encontrada no parcelamento.');
    }
    if (parcela.status === 'PAGA') {
      throw new Error('Esta parcela já foi paga.');
    }

    parcela.status = 'PAGA';
    parcela.dataPagamento = dados.dataPagamento;
    return this.repo.atualizarParcelamento(parcelamento);
  }

  /**
   * Lista vencimentos consolidados (retenções a recolher e parcelas em aberto) (CA-1 e CA-3)
   */
  public async listarVencimentos(
    empresaId: string,
    dataReferencia: string,
    ateData?: string
  ): Promise<ItemVencimentoTributario[]> {
    if (!empresaId?.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    this.validarDataISO(dataReferencia, 'referencia');
    if (ateData) {
      this.validarDataISO(ateData, 'ate');
    }

    const itens: ItemVencimentoTributario[] = [];

    const retencoes = await this.repo.listarRetencoes(empresaId.trim());
    for (const r of retencoes) {
      if (r.tipo === 'RETIDO' && (!ateData || r.dataVencimento <= ateData)) {
        itens.push({
          origem: 'RETENCAO',
          referenciaId: r.id,
          tributo: r.tributo,
          dataVencimento: r.dataVencimento,
          valor: r.valor,
          status: r.dataVencimento < dataReferencia ? 'ATRASADO' : 'ABERTO',
          detalhe: `Retenção competência ${r.competencia}`,
        });
      }
    }

    const parcelamentos = await this.repo.listarParcelamentos(empresaId.trim());
    for (const p of parcelamentos) {
      for (const parcela of p.parcelas) {
        if (
          parcela.status !== 'PAGA' &&
          (!ateData || parcela.dataVencimento <= ateData)
        ) {
          itens.push({
            origem: 'PARCELAMENTO',
            referenciaId: p.id,
            tributo: p.tributo,
            dataVencimento: parcela.dataVencimento,
            valor: parcela.valor,
            status:
              parcela.dataVencimento < dataReferencia ? 'ATRASADO' : 'ABERTO',
            detalhe: `Parcela ${parcela.numero}/${p.quantidadeParcelas}`,
          });
        }
      }
    }

    return itens.sort((a, b) =>
      a.dataVencimento.localeCompare(b.dataVencimento)
    );
  }
}
