import * as crypto from 'crypto';
import {
  BaixaTitulo,
  ItemParcelaInadimplente,
  ResultadoInadimplencia,
  ResumoParcelaBaixa,
  StatusParcela,
} from '../models/BaixaTituloModel';
import { ParcelaTitulo, TituloFinanceiro } from '../models/TituloFinanceiroModel';
import { IBaixaTituloRepository } from '../repositories/BaixaTituloRepository';
import { ITituloFinanceiroRepository } from '../repositories/TituloFinanceiroRepository';

/**
 * Serviço para controle de baixas totais/parciais, juros, multas, descontos,
 * estornos e inadimplência (SPEC-2.10 / RF-047)
 */
export class BaixaTituloService {
  constructor(
    private readonly baixaRepo: IBaixaTituloRepository,
    private readonly tituloRepo: ITituloFinanceiroRepository
  ) {}

  private arredondar(valor: number): number {
    return Number(valor.toFixed(2));
  }

  private async buscarTituloDaEmpresa(
    empresaId: string,
    tituloId: string
  ): Promise<TituloFinanceiro> {
    const titulo = await this.tituloRepo.buscarPorId(tituloId);
    if (!titulo || titulo.empresaId !== empresaId) {
      throw new Error('Título não encontrado para esta empresa.');
    }
    return titulo;
  }

  private calcularSituacaoParcela(
    parcela: ParcelaTitulo,
    baixasParcela: BaixaTitulo[],
    dataReferencia?: string
  ): ResumoParcelaBaixa {
    let valorBaixado = 0;
    for (const b of baixasParcela) {
      if (!b.estornada) {
        valorBaixado += b.principalBaixado;
      }
    }
    valorBaixado = this.arredondar(valorBaixado);
    const saldoEmAberto = this.arredondar(
      Math.max(0, parcela.valor - valorBaixado)
    );

    let status: StatusParcela = 'ABERTA';
    if (saldoEmAberto <= 0.009) {
      status = 'LIQUIDADA';
    } else if (valorBaixado > 0) {
      status = 'PARCIAL';
    }

    const inadimplente = Boolean(
      dataReferencia &&
        status !== 'LIQUIDADA' &&
        parcela.vencimento < dataReferencia
    );

    return {
      numero: parcela.numero,
      valorOriginal: parcela.valor,
      valorBaixado,
      saldoEmAberto,
      vencimento: parcela.vencimento,
      status,
      inadimplente,
    };
  }

  /**
   * Registra baixa total ou parcial com juros, multa e desconto (CA-1 e CA-4)
   */
  public async registrarBaixa(dados: {
    empresaId: string;
    tituloId: string;
    numeroParcela: number;
    dataBaixa: string;
    principalBaixado: number;
    juros?: number;
    multa?: number;
    desconto?: number;
  }): Promise<{ baixa: BaixaTitulo; parcela: ResumoParcelaBaixa }> {
    const empresaId = (dados.empresaId || '').trim();
    if (!empresaId) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    if (!dados.dataBaixa || !/^\d{4}-\d{2}-\d{2}$/.test(dados.dataBaixa)) {
      throw new Error('A data da baixa deve ser informada no formato YYYY-MM-DD.');
    }

    const principalBaixado = dados.principalBaixado;
    const juros = dados.juros ?? 0;
    const multa = dados.multa ?? 0;
    const desconto = dados.desconto ?? 0;

    if (
      typeof principalBaixado !== 'number' ||
      Number.isNaN(principalBaixado) ||
      principalBaixado <= 0
    ) {
      throw new Error('O valor principal baixado deve ser maior que zero.');
    }
    if (juros < 0 || multa < 0 || desconto < 0) {
      throw new Error(
        'Juros, multa e desconto não podem possuir valores negativos.'
      );
    }

    const valorLiquido = this.arredondar(
      principalBaixado + juros + multa - desconto
    );
    if (valorLiquido < 0) {
      throw new Error(
        'O desconto não pode superar o total devido na operação de baixa.'
      );
    }

    const titulo = await this.buscarTituloDaEmpresa(empresaId, dados.tituloId);
    const parcela = titulo.parcelas.find((p) => p.numero === dados.numeroParcela);
    if (!parcela) {
      throw new Error(
        `Parcela ${dados.numeroParcela} não encontrada no título.`
      );
    }

    const baixasExistentes = await this.baixaRepo.listarPorParcela(
      empresaId,
      titulo.id,
      parcela.numero
    );
    const situacaoAtual = this.calcularSituacaoParcela(parcela, baixasExistentes);

    if (principalBaixado > situacaoAtual.saldoEmAberto + 0.009) {
      throw new Error(
        `O valor principal (${principalBaixado.toFixed(2)}) excede o saldo em aberto da parcela (${situacaoAtual.saldoEmAberto.toFixed(2)}).`
      );
    }

    const baixa: BaixaTitulo = {
      id: crypto.randomUUID(),
      empresaId,
      tituloId: titulo.id,
      numeroParcela: parcela.numero,
      tipoOperacao: titulo.tipo === 'PAGAR' ? 'PAGAMENTO' : 'RECEBIMENTO',
      dataBaixa: dados.dataBaixa,
      principalBaixado: this.arredondar(principalBaixado),
      juros: this.arredondar(juros),
      multa: this.arredondar(multa),
      desconto: this.arredondar(desconto),
      valorLiquido,
      estornada: false,
      criadoEm: new Date(),
    };

    await this.baixaRepo.salvar(baixa);
    const novaSituacao = this.calcularSituacaoParcela(parcela, [
      ...baixasExistentes,
      baixa,
    ]);

    return { baixa, parcela: novaSituacao };
  }

  /**
   * Estorna uma baixa registrada recompondo o saldo em aberto da parcela (CA-2 e CA-4)
   */
  public async estornarBaixa(
    empresaId: string,
    baixaId: string,
    motivo?: string
  ): Promise<{ baixa: BaixaTitulo; parcela: ResumoParcelaBaixa }> {
    const baixa = await this.baixaRepo.buscarPorId(baixaId);
    if (!baixa || baixa.empresaId !== empresaId) {
      throw new Error('Baixa não encontrada para esta empresa.');
    }
    if (baixa.estornada) {
      throw new Error('Esta baixa já foi estornada anteriormente.');
    }

    baixa.estornada = true;
    baixa.estornadaEm = new Date();
    baixa.motivoEstorno = motivo?.trim() || 'Estorno solicitado pelo usuário';
    await this.baixaRepo.salvar(baixa);

    const titulo = await this.buscarTituloDaEmpresa(empresaId, baixa.tituloId);
    const parcela = titulo.parcelas.find((p) => p.numero === baixa.numeroParcela)!;
    const baixasParcela = await this.baixaRepo.listarPorParcela(
      empresaId,
      titulo.id,
      parcela.numero
    );

    return {
      baixa,
      parcela: this.calcularSituacaoParcela(parcela, baixasParcela),
    };
  }

  /**
   * Lista a situação atual das parcelas de um título (CA-1 e CA-2)
   */
  public async obterSituacaoParcelas(
    empresaId: string,
    tituloId: string,
    dataReferencia?: string
  ): Promise<ResumoParcelaBaixa[]> {
    const titulo = await this.buscarTituloDaEmpresa(empresaId, tituloId);
    const resultado: ResumoParcelaBaixa[] = [];

    for (const parcela of titulo.parcelas) {
      const baixas = await this.baixaRepo.listarPorParcela(
        empresaId,
        titulo.id,
        parcela.numero
      );
      resultado.push(
        this.calcularSituacaoParcela(parcela, baixas, dataReferencia)
      );
    }
    return resultado;
  }

  /**
   * Verifica e marca parcelas inadimplentes na empresa para a data de referência (CA-3)
   */
  public async verificarInadimplencia(
    empresaId: string,
    dataReferencia: string
  ): Promise<ResultadoInadimplencia> {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    if (!dataReferencia || !/^\d{4}-\d{2}-\d{2}$/.test(dataReferencia)) {
      throw new Error(
        'A data de referência deve ser informada no formato YYYY-MM-DD.'
      );
    }

    const titulos = await this.tituloRepo.listarPorEmpresa(empresaId);
    const parcelasInadimplentes: ItemParcelaInadimplente[] = [];

    for (const titulo of titulos) {
      for (const parcela of titulo.parcelas) {
        const baixas = await this.baixaRepo.listarPorParcela(
          empresaId,
          titulo.id,
          parcela.numero
        );
        const situacao = this.calcularSituacaoParcela(
          parcela,
          baixas,
          dataReferencia
        );
        if (situacao.inadimplente) {
          parcelasInadimplentes.push({
            tituloId: titulo.id,
            tipoTitulo: titulo.tipo,
            contraparteNome: titulo.contraparte.nome,
            numeroParcela: parcela.numero,
            vencimento: parcela.vencimento,
            saldoEmAberto: situacao.saldoEmAberto,
            status: situacao.status,
            inadimplente: true,
          });
        }
      }
    }

    return {
      empresaId,
      dataReferencia,
      parcelasInadimplentes,
    };
  }
}
