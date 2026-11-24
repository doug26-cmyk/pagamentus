import * as crypto from 'crypto';
import {
  BemPatrimonial,
  MovimentacaoEstoque,
  PoliticaPatrimonial,
  RegistroEncargoPatrimonial,
  SaldoEstoqueItem,
  TipoEncargoPatrimonial,
  TipoMovimentacaoEstoque,
} from '../models/PatrimonioEstoqueModel';
import { IPatrimonioEstoqueRepository } from '../repositories/PatrimonioEstoqueRepository';

/**
 * Serviço para gestão de Patrimônio (bens, depreciação/amortização/exaustão,
 * transferências, reavaliações, baixas e histórico documental) e Estoque
 * (SPEC-2.13 / RF-057, RF-058, RF-059, RF-060)
 */
export class PatrimonioEstoqueService {
  constructor(private readonly repo: IPatrimonioEstoqueRepository) {}

  private arredondar(valor: number): number {
    return Number(valor.toFixed(2));
  }

  private async buscarBemDaEmpresa(
    empresaId: string,
    bemId: string
  ): Promise<BemPatrimonial> {
    const bem = await this.repo.buscarBemPorId(bemId);
    if (!bem || bem.empresaId !== empresaId) {
      throw new Error('Bem patrimonial não encontrado para esta empresa.');
    }
    return bem;
  }

  // ============================================================================
  // CA-1 e CA-4: Cadastro de Bem e Depreciação / Amortização / Exaustão
  // ============================================================================

  /**
   * Cadastra um bem patrimonial com dados de aquisição, vida útil e política (RF-057)
   */
  public async cadastrarBem(dados: {
    empresaId: string;
    codigo: string;
    descricao: string;
    tipoEncargo?: TipoEncargoPatrimonial;
    localizacao: string;
    responsavel: string;
    dataAquisicao: string;
    custoAquisicao: number;
    vidaUtilMeses: number;
    valorResidual: number;
    politica?: Partial<PoliticaPatrimonial>;
    documentoReferencia?: string;
  }): Promise<BemPatrimonial> {
    const empresaId = (dados.empresaId || '').trim();
    if (!empresaId) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    if (
      !dados.codigo?.trim() ||
      !dados.descricao?.trim() ||
      !dados.localizacao?.trim() ||
      !dados.responsavel?.trim()
    ) {
      throw new Error(
        'Código, descrição, localização e responsável do bem são obrigatórios.'
      );
    }
    if (!dados.dataAquisicao || !/^\d{4}-\d{2}-\d{2}$/.test(dados.dataAquisicao)) {
      throw new Error(
        'A data de aquisição deve ser informada no formato YYYY-MM-DD.'
      );
    }
    if (typeof dados.custoAquisicao !== 'number' || dados.custoAquisicao <= 0) {
      throw new Error('O custo de aquisição deve ser maior que zero.');
    }
    if (typeof dados.vidaUtilMeses !== 'number' || dados.vidaUtilMeses <= 0) {
      throw new Error('A vida útil em meses deve ser maior que zero.');
    }
    if (
      typeof dados.valorResidual !== 'number' ||
      dados.valorResidual < 0 ||
      dados.valorResidual >= dados.custoAquisicao
    ) {
      throw new Error(
        'O valor residual deve ser >= 0 e menor que o custo de aquisição.'
      );
    }

    const tipoEncargo: TipoEncargoPatrimonial =
      dados.tipoEncargo || 'DEPRECIACAO';
    const custo = this.arredondar(dados.custoAquisicao);
    const residual = this.arredondar(dados.valorResidual);

    const bem: BemPatrimonial = {
      id: crypto.randomUUID(),
      empresaId,
      codigo: dados.codigo.trim(),
      descricao: dados.descricao.trim(),
      tipoEncargo,
      localizacao: dados.localizacao.trim(),
      responsavel: dados.responsavel.trim(),
      dataAquisicao: dados.dataAquisicao,
      custoAquisicao: custo,
      vidaUtilMeses: dados.vidaUtilMeses,
      valorResidual: residual,
      depreciacaoAcumulada: 0,
      valorContabilLiquido: custo,
      status: 'ATIVO',
      politica: {
        metodo: 'LINEAR',
        permiteReavaliacao: dados.politica?.permiteReavaliacao ?? false,
        taxaAnualFiscal: dados.politica?.taxaAnualFiscal,
      },
      encargos: [],
      historicoDocumental: [
        {
          id: crypto.randomUUID(),
          tipo: 'AQUISICAO',
          data: dados.dataAquisicao,
          descricao: `Aquisição de ${dados.descricao.trim()} (${dados.localizacao.trim()})`,
          documentoReferencia: dados.documentoReferencia,
          registradoEm: new Date(),
        },
      ],
      criadoEm: new Date(),
    };

    return this.repo.salvarBem(bem);
  }

  public async listarBens(empresaId: string): Promise<BemPatrimonial[]> {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    return this.repo.listarBensPorEmpresa(empresaId);
  }

  /**
   * Calcula e registra o encargo mensal (depreciação/amortização/exaustão) (RF-058)
   */
  public async registrarEncargo(
    empresaId: string,
    bemId: string,
    competencia: string
  ): Promise<{ bem: BemPatrimonial; encargo: RegistroEncargoPatrimonial }> {
    if (!competencia || !/^\d{4}-\d{2}$/.test(competencia)) {
      throw new Error('A competência deve ser informada no formato YYYY-MM.');
    }

    const bem = await this.buscarBemDaEmpresa(empresaId, bemId);
    if (bem.status === 'BAIXADO') {
      throw new Error(
        'Não é possível registrar depreciação/encargo para bem já baixado.'
      );
    }
    if (bem.encargos.some((e) => e.competencia === competencia)) {
      throw new Error(
        `Já existe encargo registrado para a competência ${competencia}.`
      );
    }

    const saldoDepreciavelRestante = this.arredondar(
      bem.valorContabilLiquido - bem.valorResidual
    );
    if (saldoDepreciavelRestante <= 0) {
      throw new Error('O bem já atingiu o valor residual configurado.');
    }

    const quotaMensal =
      (bem.custoAquisicao - bem.valorResidual) / bem.vidaUtilMeses;
    const valorEncargo = this.arredondar(
      Math.min(quotaMensal, saldoDepreciavelRestante)
    );

    bem.depreciacaoAcumulada = this.arredondar(
      bem.depreciacaoAcumulada + valorEncargo
    );
    bem.valorContabilLiquido = this.arredondar(
      bem.valorContabilLiquido - valorEncargo
    );

    const encargo: RegistroEncargoPatrimonial = {
      id: crypto.randomUUID(),
      competencia,
      tipoEncargo: bem.tipoEncargo,
      valorEncargo,
      acumuladoApos: bem.depreciacaoAcumulada,
      valorContabilLiquidoApos: bem.valorContabilLiquido,
      registradoEm: new Date(),
    };

    bem.encargos.push(encargo);
    bem.historicoDocumental.push({
      id: crypto.randomUUID(),
      tipo: 'ENCARGO',
      data: `${competencia}-01`,
      descricao: `Registro de ${bem.tipoEncargo} na competência ${competencia}: R$ ${valorEncargo.toFixed(2)}`,
      registradoEm: new Date(),
    });

    await this.repo.salvarBem(bem);
    return { bem, encargo };
  }

  // ============================================================================
  // CA-2 e CA-4: Transferência, Reavaliação Permitida, Baixa e Histórico
  // ============================================================================

  /**
   * Registra transferência de localização e/ou responsável com histórico documental (RF-059)
   */
  public async transferirBem(
    empresaId: string,
    bemId: string,
    dados: {
      data: string;
      novaLocalizacao?: string;
      novoResponsavel?: string;
      documentoReferencia?: string;
    }
  ): Promise<BemPatrimonial> {
    if (!dados.data || !/^\d{4}-\d{2}-\d{2}$/.test(dados.data)) {
      throw new Error('A data da transferência deve estar no formato YYYY-MM-DD.');
    }
    if (!dados.novaLocalizacao?.trim() && !dados.novoResponsavel?.trim()) {
      throw new Error(
        'Informe a nova localização ou o novo responsável para transferência.'
      );
    }

    const bem = await this.buscarBemDaEmpresa(empresaId, bemId);
    if (bem.status === 'BAIXADO') {
      throw new Error('Não é possível transferir um bem já baixado.');
    }

    const origem = `${bem.localizacao} / ${bem.responsavel}`;
    if (dados.novaLocalizacao?.trim()) {
      bem.localizacao = dados.novaLocalizacao.trim();
    }
    if (dados.novoResponsavel?.trim()) {
      bem.responsavel = dados.novoResponsavel.trim();
    }

    bem.historicoDocumental.push({
      id: crypto.randomUUID(),
      tipo: 'TRANSFERENCIA',
      data: dados.data,
      descricao: `Transferência de (${origem}) para (${bem.localizacao} / ${bem.responsavel})`,
      documentoReferencia: dados.documentoReferencia,
      registradoEm: new Date(),
    });

    return this.repo.salvarBem(bem);
  }

  /**
   * Registra reavaliação quando permitida pela política do bem (RF-059)
   */
  public async reavaliarBem(
    empresaId: string,
    bemId: string,
    dados: {
      data: string;
      novoValorContabil: number;
      documentoReferencia?: string;
    }
  ): Promise<BemPatrimonial> {
    if (!dados.data || !/^\d{4}-\d{2}-\d{2}$/.test(dados.data)) {
      throw new Error('A data da reavaliação deve estar no formato YYYY-MM-DD.');
    }
    const bem = await this.buscarBemDaEmpresa(empresaId, bemId);
    if (bem.status === 'BAIXADO') {
      throw new Error('Não é possível reavaliar um bem já baixado.');
    }
    if (!bem.politica.permiteReavaliacao) {
      throw new Error(
        'A política configurada para este bem não permite reavaliação.'
      );
    }
    if (
      typeof dados.novoValorContabil !== 'number' ||
      dados.novoValorContabil <= bem.valorResidual
    ) {
      throw new Error(
        'O novo valor contábil deve ser maior que o valor residual do bem.'
      );
    }

    const valorAnterior = bem.valorContabilLiquido;
    bem.valorContabilLiquido = this.arredondar(dados.novoValorContabil);

    bem.historicoDocumental.push({
      id: crypto.randomUUID(),
      tipo: 'REAVALIACAO',
      data: dados.data,
      descricao: `Reavaliação contábil de R$ ${valorAnterior.toFixed(2)} para R$ ${bem.valorContabilLiquido.toFixed(2)}`,
      documentoReferencia: dados.documentoReferencia,
      registradoEm: new Date(),
    });

    return this.repo.salvarBem(bem);
  }

  /**
   * Registra a baixa patrimonial com documento comprobatório (RF-059)
   */
  public async baixarBem(
    empresaId: string,
    bemId: string,
    dados: {
      dataBaixa: string;
      motivo: string;
      documentoReferencia?: string;
    }
  ): Promise<BemPatrimonial> {
    if (!dados.dataBaixa || !/^\d{4}-\d{2}-\d{2}$/.test(dados.dataBaixa)) {
      throw new Error('A data da baixa deve estar no formato YYYY-MM-DD.');
    }
    if (!dados.motivo?.trim()) {
      throw new Error('O motivo da baixa patrimonial é obrigatório.');
    }

    const bem = await this.buscarBemDaEmpresa(empresaId, bemId);
    if (bem.status === 'BAIXADO') {
      throw new Error('Este bem patrimonial já foi baixado.');
    }

    bem.status = 'BAIXADO';
    bem.historicoDocumental.push({
      id: crypto.randomUUID(),
      tipo: 'BAIXA',
      data: dados.dataBaixa,
      descricao: `Baixa patrimonial: ${dados.motivo.trim()}`,
      documentoReferencia: dados.documentoReferencia,
      registradoEm: new Date(),
    });

    return this.repo.salvarBem(bem);
  }

  // ============================================================================
  // CA-3 e CA-4: Importação de Saldos e Movimentações de Estoque
  // ============================================================================

  /**
   * Importa saldos iniciais e movimentações de estoque da empresa (RF-060)
   */
  public async importarEstoque(
    empresaId: string,
    itens: Array<{
      sku: string;
      descricao: string;
      data: string;
      tipo: TipoMovimentacaoEstoque;
      quantidade: number;
      valorUnitario: number;
      documentoReferencia?: string;
    }>
  ): Promise<MovimentacaoEstoque[]> {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    if (!Array.isArray(itens) || itens.length === 0) {
      throw new Error(
        'Informe ao menos um saldo ou movimentação de estoque para importação.'
      );
    }

    const tiposValidos: TipoMovimentacaoEstoque[] = [
      'SALDO_INICIAL',
      'ENTRADA',
      'SAIDA',
      'AJUSTE',
    ];

    const formatados: MovimentacaoEstoque[] = itens.map((item, idx) => {
      if (!item.sku?.trim() || !item.descricao?.trim()) {
        throw new Error(
          `O item ${idx + 1} deve informar sku e descricao válidos.`
        );
      }
      if (!item.data || !/^\d{4}-\d{2}-\d{2}$/.test(item.data)) {
        throw new Error(
          `O item ${idx + 1} deve informar data no formato YYYY-MM-DD.`
        );
      }
      if (!tiposValidos.includes(item.tipo)) {
        throw new Error(`Tipo de movimentação inválido no item ${idx + 1}.`);
      }
      if (
        typeof item.quantidade !== 'number' ||
        Number.isNaN(item.quantidade) ||
        (item.tipo !== 'AJUSTE' && item.quantidade <= 0) ||
        (item.tipo === 'AJUSTE' && item.quantidade === 0)
      ) {
        throw new Error(`Quantidade inválida no item ${idx + 1}.`);
      }
      if (
        typeof item.valorUnitario !== 'number' ||
        Number.isNaN(item.valorUnitario) ||
        item.valorUnitario < 0
      ) {
        throw new Error(`Valor unitário inválido no item ${idx + 1}.`);
      }

      return {
        id: crypto.randomUUID(),
        empresaId,
        sku: item.sku.trim(),
        descricao: item.descricao.trim(),
        data: item.data,
        tipo: item.tipo,
        quantidade: item.quantidade,
        valorUnitario: this.arredondar(item.valorUnitario),
        documentoReferencia: item.documentoReferencia,
        importadoEm: new Date(),
      };
    });

    return this.repo.salvarMovimentacoesEstoque(formatados);
  }

  /**
   * Consolida os saldos de estoque por SKU a partir das movimentações importadas (RF-060)
   */
  public async consultarSaldosEstoque(
    empresaId: string
  ): Promise<SaldoEstoqueItem[]> {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }

    const movimentacoes = await this.repo.listarMovimentacoesEstoque(empresaId);
    const mapa = new Map<string, SaldoEstoqueItem>();

    for (const mov of movimentacoes) {
      if (!mapa.has(mov.sku)) {
        mapa.set(mov.sku, {
          sku: mov.sku,
          descricao: mov.descricao,
          quantidadeSaldo: 0,
          valorTotalSaldo: 0,
        });
      }
      const reg = mapa.get(mov.sku)!;
      const sinal = mov.tipo === 'SAIDA' ? -1 : 1;
      reg.quantidadeSaldo += sinal * mov.quantidade;
      reg.valorTotalSaldo = this.arredondar(
        reg.valorTotalSaldo + sinal * mov.quantidade * mov.valorUnitario
      );
    }

    return Array.from(mapa.values()).sort((a, b) => a.sku.localeCompare(b.sku));
  }
}
