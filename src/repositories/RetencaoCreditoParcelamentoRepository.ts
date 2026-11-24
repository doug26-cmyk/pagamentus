import {
  CompensacaoTributaria,
  CreditoTributario,
  ParcelamentoTributario,
  RetencaoTributaria,
} from '../models/RetencaoCreditoParcelamentoModel';

/**
 * Interface do repositório de Retenções, Créditos e Parcelamentos (SPEC-3.8)
 */
export interface IRetencaoCreditoParcelamentoRepository {
  salvarRetencao(retencao: RetencaoTributaria): Promise<RetencaoTributaria>;
  listarRetencoes(empresaId: string): Promise<RetencaoTributaria[]>;

  salvarCredito(credito: CreditoTributario): Promise<CreditoTributario>;
  buscarCreditoPorId(
    empresaId: string,
    creditoId: string
  ): Promise<CreditoTributario | null>;
  atualizarCredito(credito: CreditoTributario): Promise<CreditoTributario>;
  listarCreditos(empresaId: string): Promise<CreditoTributario[]>;

  salvarCompensacao(
    compensacao: CompensacaoTributaria
  ): Promise<CompensacaoTributaria>;
  listarCompensacoes(empresaId: string): Promise<CompensacaoTributaria[]>;

  salvarParcelamento(
    parcelamento: ParcelamentoTributario
  ): Promise<ParcelamentoTributario>;
  buscarParcelamentoPorId(
    empresaId: string,
    parcelamentoId: string
  ): Promise<ParcelamentoTributario | null>;
  atualizarParcelamento(
    parcelamento: ParcelamentoTributario
  ): Promise<ParcelamentoTributario>;
  listarParcelamentos(empresaId: string): Promise<ParcelamentoTributario[]>;

  limpar(): Promise<void>;
}

/**
 * Repositório em memória para Retenções, Créditos, Compensações e Parcelamentos
 */
export class InMemoryRetencaoCreditoParcelamentoRepository
  implements IRetencaoCreditoParcelamentoRepository
{
  private retencoes: RetencaoTributaria[] = [];
  private creditos: CreditoTributario[] = [];
  private compensacoes: CompensacaoTributaria[] = [];
  private parcelamentos: ParcelamentoTributario[] = [];

  async salvarRetencao(
    retencao: RetencaoTributaria
  ): Promise<RetencaoTributaria> {
    this.retencoes.push(retencao);
    return retencao;
  }

  async listarRetencoes(empresaId: string): Promise<RetencaoTributaria[]> {
    return this.retencoes.filter((r) => r.empresaId === empresaId);
  }

  async salvarCredito(credito: CreditoTributario): Promise<CreditoTributario> {
    this.creditos.push(credito);
    return credito;
  }

  async buscarCreditoPorId(
    empresaId: string,
    creditoId: string
  ): Promise<CreditoTributario | null> {
    return (
      this.creditos.find(
        (c) => c.empresaId === empresaId && c.id === creditoId
      ) || null
    );
  }

  async atualizarCredito(
    credito: CreditoTributario
  ): Promise<CreditoTributario> {
    const idx = this.creditos.findIndex((c) => c.id === credito.id);
    if (idx >= 0) {
      this.creditos[idx] = credito;
    }
    return credito;
  }

  async listarCreditos(empresaId: string): Promise<CreditoTributario[]> {
    return this.creditos.filter((c) => c.empresaId === empresaId);
  }

  async salvarCompensacao(
    compensacao: CompensacaoTributaria
  ): Promise<CompensacaoTributaria> {
    this.compensacoes.push(compensacao);
    return compensacao;
  }

  async listarCompensacoes(
    empresaId: string
  ): Promise<CompensacaoTributaria[]> {
    return this.compensacoes.filter((c) => c.empresaId === empresaId);
  }

  async salvarParcelamento(
    parcelamento: ParcelamentoTributario
  ): Promise<ParcelamentoTributario> {
    this.parcelamentos.push(parcelamento);
    return parcelamento;
  }

  async buscarParcelamentoPorId(
    empresaId: string,
    parcelamentoId: string
  ): Promise<ParcelamentoTributario | null> {
    return (
      this.parcelamentos.find(
        (p) => p.empresaId === empresaId && p.id === parcelamentoId
      ) || null
    );
  }

  async atualizarParcelamento(
    parcelamento: ParcelamentoTributario
  ): Promise<ParcelamentoTributario> {
    const idx = this.parcelamentos.findIndex((p) => p.id === parcelamento.id);
    if (idx >= 0) {
      this.parcelamentos[idx] = parcelamento;
    }
    return parcelamento;
  }

  async listarParcelamentos(
    empresaId: string
  ): Promise<ParcelamentoTributario[]> {
    return this.parcelamentos.filter((p) => p.empresaId === empresaId);
  }

  async limpar(): Promise<void> {
    this.retencoes = [];
    this.creditos = [];
    this.compensacoes = [];
    this.parcelamentos = [];
  }
}
