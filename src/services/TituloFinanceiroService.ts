import * as crypto from 'crypto';
import {
  AnexoTitulo,
  ContraparteTitulo,
  ParcelaTitulo,
  TipoTitulo,
  TituloFinanceiro,
} from '../models/TituloFinanceiroModel';
import { ILancamentoContabilRepository } from '../repositories/LancamentoContabilRepository';
import { ITituloFinanceiroRepository } from '../repositories/TituloFinanceiroRepository';

/**
 * Serviço para cadastro de Títulos a Pagar/Receber, Parcelas, Anexos e Vínculos
 * (SPEC-2.9 / RF-046, RF-050)
 */
export class TituloFinanceiroService {
  constructor(
    private readonly tituloRepo: ITituloFinanceiroRepository,
    private readonly lancamentoRepo: ILancamentoContabilRepository
  ) {}

  /**
   * Cadastra um título a pagar ou a receber com parcelas e vencimentos (CA-1 e CA-4)
   */
  public async cadastrarTitulo(dados: {
    empresaId: string;
    tipo: TipoTitulo;
    contraparte: ContraparteTitulo;
    categoria: string;
    condicaoPagamento: string;
    centroCustoId?: string;
    valorTotal: number;
    parcelas: ParcelaTitulo[];
  }): Promise<TituloFinanceiro> {
    const empresaId = (dados.empresaId || '').trim();
    if (!empresaId) {
      throw new Error('O identificador da empresa é obrigatório.');
    }

    if (dados.tipo !== 'PAGAR' && dados.tipo !== 'RECEBER') {
      throw new Error("Tipo de título inválido. Utilize 'PAGAR' ou 'RECEBER'.");
    }

    if (
      !dados.contraparte ||
      !dados.contraparte.nome ||
      !dados.contraparte.nome.trim() ||
      (dados.contraparte.tipo !== 'FORNECEDOR' &&
        dados.contraparte.tipo !== 'CLIENTE')
    ) {
      throw new Error(
        'Fornecedor ou cliente válido (nome e tipo FORNECEDOR/CLIENTE) é obrigatório.'
      );
    }

    const categoria = (dados.categoria || '').trim();
    const condicaoPagamento = (dados.condicaoPagamento || '').trim();
    if (!categoria || !condicaoPagamento) {
      throw new Error(
        'A categoria e a condição de pagamento são obrigatórias.'
      );
    }

    if (
      typeof dados.valorTotal !== 'number' ||
      Number.isNaN(dados.valorTotal) ||
      dados.valorTotal <= 0
    ) {
      throw new Error('O valor total do título deve ser maior que zero.');
    }

    if (!Array.isArray(dados.parcelas) || dados.parcelas.length === 0) {
      throw new Error('O título deve possuir ao menos uma parcela.');
    }

    let somaParcelas = 0;
    const parcelasFormatadas: ParcelaTitulo[] = dados.parcelas.map((p, idx) => {
      if (typeof p.valor !== 'number' || Number.isNaN(p.valor) || p.valor <= 0) {
        throw new Error(`A parcela ${idx + 1} deve possuir valor positivo.`);
      }
      if (!p.vencimento || !/^\d{4}-\d{2}-\d{2}$/.test(p.vencimento)) {
        throw new Error(
          `A parcela ${idx + 1} deve possuir vencimento no formato YYYY-MM-DD.`
        );
      }
      somaParcelas += p.valor;
      return {
        numero: p.numero || idx + 1,
        valor: Number(p.valor.toFixed(2)),
        vencimento: p.vencimento,
      };
    });

    if (Math.abs(somaParcelas - dados.valorTotal) > 0.01) {
      throw new Error(
        `A soma das parcelas (${somaParcelas.toFixed(2)}) diverge do valor total do título (${dados.valorTotal.toFixed(2)}).`
      );
    }

    const titulo: TituloFinanceiro = {
      id: crypto.randomUUID(),
      empresaId,
      tipo: dados.tipo,
      contraparte: {
        id: dados.contraparte.id,
        nome: dados.contraparte.nome.trim(),
        tipo: dados.contraparte.tipo,
      },
      categoria,
      condicaoPagamento,
      centroCustoId: dados.centroCustoId,
      valorTotal: Number(dados.valorTotal.toFixed(2)),
      parcelas: parcelasFormatadas,
      vinculos: {},
      anexos: [],
      criadoEm: new Date(),
    };

    return this.tituloRepo.salvar(titulo);
  }

  /**
   * Lista todos os títulos cadastrados para a empresa (CA-3)
   */
  public async listarPorEmpresa(empresaId: string): Promise<TituloFinanceiro[]> {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    return this.tituloRepo.listarPorEmpresa(empresaId);
  }

  /**
   * Consulta um título específico da empresa por ID (CA-3)
   */
  public async buscarPorId(
    empresaId: string,
    id: string
  ): Promise<TituloFinanceiro> {
    const titulo = await this.tituloRepo.buscarPorId(id);
    if (!titulo || titulo.empresaId !== empresaId) {
      throw new Error('Título não encontrado para esta empresa.');
    }
    return titulo;
  }

  /**
   * Registra anexos e vínculos com documento fiscal, lançamento contábil e comprovante (CA-2 e CA-4)
   */
  public async registrarVinculosEAnexos(
    empresaId: string,
    tituloId: string,
    dados: {
      documentoFiscalId?: string;
      documentoFiscalNumero?: string;
      lancamentoContabilId?: string;
      comprovanteReferencia?: string;
      anexos?: Array<{
        nomeArquivo: string;
        tipoConteudo?: string;
        referenciaUri: string;
      }>;
    }
  ): Promise<TituloFinanceiro> {
    const titulo = await this.buscarPorId(empresaId, tituloId);

    if (dados.lancamentoContabilId) {
      const lancamento = await this.lancamentoRepo.buscarPorId(
        dados.lancamentoContabilId
      );
      if (!lancamento || lancamento.empresaId !== empresaId) {
        throw new Error(
          `Lançamento contábil '${dados.lancamentoContabilId}' não encontrado para esta empresa.`
        );
      }
      titulo.vinculos.lancamentoContabilId = dados.lancamentoContabilId;
    }

    if (dados.documentoFiscalId !== undefined) {
      titulo.vinculos.documentoFiscalId = dados.documentoFiscalId;
    }
    if (dados.documentoFiscalNumero !== undefined) {
      titulo.vinculos.documentoFiscalNumero = dados.documentoFiscalNumero;
    }
    if (dados.comprovanteReferencia !== undefined) {
      titulo.vinculos.comprovanteReferencia = dados.comprovanteReferencia;
    }
    titulo.vinculos.atualizadoEm = new Date();

    if (Array.isArray(dados.anexos) && dados.anexos.length > 0) {
      for (const item of dados.anexos) {
        if (!item.nomeArquivo?.trim() || !item.referenciaUri?.trim()) {
          throw new Error(
            'Cada anexo deve informar nomeArquivo e referenciaUri.'
          );
        }
        const anexo: AnexoTitulo = {
          id: crypto.randomUUID(),
          nomeArquivo: item.nomeArquivo.trim(),
          tipoConteudo: item.tipoConteudo,
          referenciaUri: item.referenciaUri.trim(),
          registradoEm: new Date(),
        };
        titulo.anexos.push(anexo);
      }
    }

    return this.tituloRepo.salvar(titulo);
  }
}
