import * as crypto from 'crypto';
import {
  AjusteNotaFiscal,
  DevolucaoNotaFiscal,
  NotaFiscal,
  RetencaoNotaFiscal,
  TipoNotaFiscal,
} from '../models/NotaFiscalModel';
import { INotaFiscalRepository } from '../repositories/NotaFiscalRepository';

const TIPOS_NOTA_VALIDOS: TipoNotaFiscal[] = ['ENTRADA', 'SAIDA', 'SERVICO'];

/**
 * Serviço para registro de notas de entrada, saída e serviço, retenções,
 * cancelamentos, devoluções e ajustes aplicáveis (SPEC-3.2 / RF-017)
 */
export class NotaFiscalService {
  constructor(private readonly repo: INotaFiscalRepository) {}

  private arredondar(valor: number): number {
    return Number(valor.toFixed(2));
  }

  private async buscarNotaDaEmpresa(
    empresaId: string,
    notaId: string
  ): Promise<NotaFiscal> {
    const nota = await this.repo.buscarPorId(notaId);
    if (!nota || nota.empresaId !== empresaId) {
      throw new Error('Nota fiscal não encontrada para esta empresa.');
    }
    return nota;
  }

  /**
   * Registra nota fiscal de entrada, saída ou serviço com retenções (CA-1 e CA-4)
   */
  public async registrarNota(dados: {
    empresaId: string;
    tipo: TipoNotaFiscal;
    numero: string;
    serie?: string;
    dataEmissao: string;
    competencia: string;
    participanteNome: string;
    valorBruto: number;
    retencoes?: RetencaoNotaFiscal[];
  }): Promise<NotaFiscal> {
    const empresaId = (dados.empresaId || '').trim();
    if (!empresaId) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    if (!TIPOS_NOTA_VALIDOS.includes(dados.tipo)) {
      throw new Error(
        `Tipo de nota inválido. Valores permitidos: ${TIPOS_NOTA_VALIDOS.join(', ')}.`
      );
    }
    if (!dados.numero?.trim() || !dados.participanteNome?.trim()) {
      throw new Error('Número da nota e participante são obrigatórios.');
    }
    if (!dados.dataEmissao || !/^\d{4}-\d{2}-\d{2}$/.test(dados.dataEmissao)) {
      throw new Error('dataEmissao deve ser informada no formato YYYY-MM-DD.');
    }
    if (!dados.competencia || !/^\d{4}-\d{2}$/.test(dados.competencia)) {
      throw new Error('competencia deve ser informada no formato YYYY-MM.');
    }
    if (
      typeof dados.valorBruto !== 'number' ||
      Number.isNaN(dados.valorBruto) ||
      dados.valorBruto <= 0
    ) {
      throw new Error('O valor bruto da nota deve ser maior que zero.');
    }

    const retencoesFormatadas: RetencaoNotaFiscal[] = [];
    let totalRetencoes = 0;
    if (Array.isArray(dados.retencoes)) {
      for (const ret of dados.retencoes) {
        if (!ret.tributo?.trim()) {
          throw new Error('Informe o nome do tributo em cada retenção.');
        }
        if (typeof ret.valor !== 'number' || Number.isNaN(ret.valor) || ret.valor < 0) {
          throw new Error('O valor da retenção não pode ser negativo.');
        }
        const v = this.arredondar(ret.valor);
        totalRetencoes += v;
        retencoesFormatadas.push({ tributo: ret.tributo.trim(), valor: v });
      }
    }

    totalRetencoes = this.arredondar(totalRetencoes);
    const valorBruto = this.arredondar(dados.valorBruto);
    if (totalRetencoes > valorBruto) {
      throw new Error(
        'O total das retenções não pode superar o valor bruto da nota.'
      );
    }

    const nota: NotaFiscal = {
      id: crypto.randomUUID(),
      empresaId,
      tipo: dados.tipo,
      numero: dados.numero.trim(),
      serie: dados.serie?.trim() || '1',
      dataEmissao: dados.dataEmissao,
      competencia: dados.competencia,
      participanteNome: dados.participanteNome.trim(),
      valorBruto,
      retencoes: retencoesFormatadas,
      totalRetencoes,
      valorLiquido: this.arredondar(valorBruto - totalRetencoes),
      totalDevolvido: 0,
      valorAjustes: 0,
      status: 'ATIVA',
      devolucoes: [],
      ajustes: [],
      criadoEm: new Date(),
    };

    return this.repo.salvar(nota);
  }

  public async listarPorEmpresa(empresaId: string): Promise<NotaFiscal[]> {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    return this.repo.listarPorEmpresa(empresaId);
  }

  public async buscarPorId(
    empresaId: string,
    notaId: string
  ): Promise<NotaFiscal> {
    return this.buscarNotaDaEmpresa(empresaId, notaId);
  }

  /**
   * Cancela uma nota fiscal ativa (CA-2 e CA-4)
   */
  public async cancelarNota(
    empresaId: string,
    notaId: string,
    dados: { data: string; motivo: string }
  ): Promise<NotaFiscal> {
    if (!dados.data || !/^\d{4}-\d{2}-\d{2}$/.test(dados.data)) {
      throw new Error('A data do cancelamento deve estar no formato YYYY-MM-DD.');
    }
    if (!dados.motivo?.trim()) {
      throw new Error('O motivo do cancelamento é obrigatório.');
    }

    const nota = await this.buscarNotaDaEmpresa(empresaId, notaId);
    if (nota.status === 'CANCELADA') {
      throw new Error('Esta nota fiscal já está cancelada.');
    }

    nota.status = 'CANCELADA';
    nota.cancelamento = {
      data: dados.data,
      motivo: dados.motivo.trim(),
      registradoEm: new Date(),
    };

    return this.repo.salvar(nota);
  }

  /**
   * Registra devolução total ou parcial vinculada à nota ativa (CA-3 e CA-4)
   */
  public async registrarDevolucao(
    empresaId: string,
    notaId: string,
    dados: {
      data: string;
      valorDevolvido: number;
      motivo: string;
      documentoReferencia?: string;
    }
  ): Promise<NotaFiscal> {
    if (!dados.data || !/^\d{4}-\d{2}-\d{2}$/.test(dados.data)) {
      throw new Error('A data da devolução deve estar no formato YYYY-MM-DD.');
    }
    if (!dados.motivo?.trim()) {
      throw new Error('O motivo da devolução é obrigatório.');
    }
    if (
      typeof dados.valorDevolvido !== 'number' ||
      Number.isNaN(dados.valorDevolvido) ||
      dados.valorDevolvido <= 0
    ) {
      throw new Error('O valor devolvido deve ser maior que zero.');
    }

    const nota = await this.buscarNotaDaEmpresa(empresaId, notaId);
    if (nota.status === 'CANCELADA') {
      throw new Error('Não é possível registrar devolução em nota cancelada.');
    }

    const novoTotalDevolvido = this.arredondar(
      nota.totalDevolvido + dados.valorDevolvido
    );
    if (novoTotalDevolvido > nota.valorBruto + 0.009) {
      throw new Error(
        `O total devolvido (${novoTotalDevolvido.toFixed(2)}) excede o valor bruto da nota (${nota.valorBruto.toFixed(2)}).`
      );
    }

    const devolucao: DevolucaoNotaFiscal = {
      id: crypto.randomUUID(),
      data: dados.data,
      valorDevolvido: this.arredondar(dados.valorDevolvido),
      motivo: dados.motivo.trim(),
      documentoReferencia: dados.documentoReferencia?.trim(),
      registradoEm: new Date(),
    };

    nota.devolucoes.push(devolucao);
    nota.totalDevolvido = novoTotalDevolvido;
    if (nota.totalDevolvido >= nota.valorBruto - 0.009) {
      nota.status = 'DEVOLVIDA';
    }

    return this.repo.salvar(nota);
  }

  /**
   * Registra ajuste fiscal aplicável vinculado à nota ativa (CA-3 e CA-4)
   */
  public async registrarAjuste(
    empresaId: string,
    notaId: string,
    dados: {
      data: string;
      tipo: 'ACRESCIMO' | 'REDUCAO';
      descricao: string;
      valor: number;
    }
  ): Promise<NotaFiscal> {
    if (!dados.data || !/^\d{4}-\d{2}-\d{2}$/.test(dados.data)) {
      throw new Error('A data do ajuste deve estar no formato YYYY-MM-DD.');
    }
    if (dados.tipo !== 'ACRESCIMO' && dados.tipo !== 'REDUCAO') {
      throw new Error("Tipo de ajuste inválido. Utilize 'ACRESCIMO' ou 'REDUCAO'.");
    }
    if (!dados.descricao?.trim()) {
      throw new Error('A descrição do ajuste é obrigatória.');
    }
    if (typeof dados.valor !== 'number' || Number.isNaN(dados.valor) || dados.valor <= 0) {
      throw new Error('O valor do ajuste deve ser maior que zero.');
    }

    const nota = await this.buscarNotaDaEmpresa(empresaId, notaId);
    if (nota.status === 'CANCELADA') {
      throw new Error('Não é possível registrar ajuste em nota cancelada.');
    }

    const valor = this.arredondar(dados.valor);
    const ajuste: AjusteNotaFiscal = {
      id: crypto.randomUUID(),
      data: dados.data,
      tipo: dados.tipo,
      descricao: dados.descricao.trim(),
      valor,
      registradoEm: new Date(),
    };

    nota.ajustes.push(ajuste);
    nota.valorAjustes = this.arredondar(
      nota.valorAjustes + (dados.tipo === 'ACRESCIMO' ? valor : -valor)
    );

    return this.repo.salvar(nota);
  }
}
