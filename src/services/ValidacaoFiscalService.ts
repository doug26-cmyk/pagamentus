import {
  DocumentoParaValidacaoFiscal,
  MotivoRejeicaoFiscal,
  RegraValidacaoFiscal,
  ResultadoValidacaoFiscal,
} from '../models/ValidacaoFiscalModel';
import { IDocumentoFiscalImportadoRepository } from '../repositories/DocumentoFiscalImportadoRepository';
import { INotaFiscalRepository } from '../repositories/NotaFiscalRepository';
import { IValidacaoFiscalRepository } from '../repositories/ValidacaoFiscalRepository';

/**
 * Serviço para configuração de regras fiscais e validação de campos, datas,
 * valores, participantes, códigos tributários e duplicidades (SPEC-3.3 / RF-018)
 */
export class ValidacaoFiscalService {
  constructor(
    private readonly regraRepo: IValidacaoFiscalRepository,
    private readonly notaRepo: INotaFiscalRepository,
    private readonly docImportadoRepo: IDocumentoFiscalImportadoRepository
  ) {}

  /**
   * Configura as regras de validação fiscal da empresa (CA-1 e CA-4)
   */
  public async configurarRegras(
    empresaId: string,
    dados: {
      exigirCoerenciaDataCompetencia?: boolean;
      bloquearDuplicidade?: boolean;
      cfopsPermitidos?: string[];
      cstsPermitidos?: string[];
      valorMaximoPermitido?: number;
    }
  ): Promise<RegraValidacaoFiscal> {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    if (
      dados.cfopsPermitidos !== undefined &&
      (!Array.isArray(dados.cfopsPermitidos) ||
        dados.cfopsPermitidos.some((c) => !/^\d{4}$/.test(String(c))))
    ) {
      throw new Error(
        'cfopsPermitidos deve ser uma lista de códigos CFOP com 4 dígitos.'
      );
    }
    if (
      dados.cstsPermitidos !== undefined &&
      (!Array.isArray(dados.cstsPermitidos) ||
        dados.cstsPermitidos.some((c) => !String(c).trim()))
    ) {
      throw new Error(
        'cstsPermitidos deve ser uma lista de códigos CST/CSOSN válidos.'
      );
    }
    if (
      dados.valorMaximoPermitido !== undefined &&
      (typeof dados.valorMaximoPermitido !== 'number' ||
        dados.valorMaximoPermitido <= 0)
    ) {
      throw new Error('valorMaximoPermitido deve ser maior que zero.');
    }

    const regra: RegraValidacaoFiscal = {
      empresaId: empresaId.trim(),
      exigirCoerenciaDataCompetencia:
        dados.exigirCoerenciaDataCompetencia ?? true,
      bloquearDuplicidade: dados.bloquearDuplicidade ?? true,
      cfopsPermitidos: dados.cfopsPermitidos || [],
      cstsPermitidos: dados.cstsPermitidos || [],
      valorMaximoPermitido: dados.valorMaximoPermitido,
      atualizadoEm: new Date(),
    };

    return this.regraRepo.salvarRegra(regra);
  }

  public async obterRegras(empresaId: string): Promise<RegraValidacaoFiscal> {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    const existente = await this.regraRepo.obterRegraPorEmpresa(empresaId);
    if (existente) return existente;

    return {
      empresaId,
      exigirCoerenciaDataCompetencia: true,
      bloquearDuplicidade: true,
      cfopsPermitidos: [],
      cstsPermitidos: [],
      atualizadoEm: new Date(),
    };
  }

  /**
   * Valida um documento fiscal contra regras configuradas e duplicidades (CA-1, CA-2 e CA-3)
   */
  public async validarDocumento(
    empresaId: string,
    doc: DocumentoParaValidacaoFiscal
  ): Promise<ResultadoValidacaoFiscal> {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }

    const regra = await this.obterRegras(empresaId);
    const motivos: MotivoRejeicaoFiscal[] = [];

    // 1. Campos fiscais básicos
    if (!['ENTRADA', 'SAIDA', 'SERVICO'].includes(doc.tipo)) {
      motivos.push({
        campo: 'tipo',
        codigoRegra: 'CAMPO_INVALIDO',
        motivo: "Tipo de documento inválido. Utilize 'ENTRADA', 'SAIDA' ou 'SERVICO'.",
      });
    }
    if (!doc.numero || !doc.numero.trim()) {
      motivos.push({
        campo: 'numero',
        codigoRegra: 'CAMPO_OBRIGATORIO',
        motivo: 'O número do documento fiscal é obrigatório.',
      });
    }

    // 2. Datas e coerência com competência
    const dataValida = Boolean(
      doc.dataEmissao && /^\d{4}-\d{2}-\d{2}$/.test(doc.dataEmissao)
    );
    const compValida = Boolean(
      doc.competencia && /^\d{4}-\d{2}$/.test(doc.competencia)
    );
    if (!dataValida) {
      motivos.push({
        campo: 'dataEmissao',
        codigoRegra: 'DATA_INVALIDA',
        motivo: 'A data de emissão deve estar no formato YYYY-MM-DD.',
      });
    }
    if (!compValida) {
      motivos.push({
        campo: 'competencia',
        codigoRegra: 'COMPETENCIA_INVALIDA',
        motivo: 'A competência deve estar no formato YYYY-MM.',
      });
    }
    if (
      regra.exigirCoerenciaDataCompetencia &&
      dataValida &&
      compValida &&
      doc.dataEmissao.slice(0, 7) !== doc.competencia
    ) {
      motivos.push({
        campo: 'dataEmissao',
        codigoRegra: 'DATA_INCOERENTE_COMPETENCIA',
        motivo: `A data de emissão (${doc.dataEmissao}) não pertence à competência informada (${doc.competencia}).`,
      });
    }

    // 3. Valores
    if (
      typeof doc.valorTotal !== 'number' ||
      Number.isNaN(doc.valorTotal) ||
      doc.valorTotal <= 0
    ) {
      motivos.push({
        campo: 'valorTotal',
        codigoRegra: 'VALOR_INVALIDO',
        motivo: 'O valor total do documento deve ser maior que zero.',
      });
    } else if (
      regra.valorMaximoPermitido !== undefined &&
      doc.valorTotal > regra.valorMaximoPermitido
    ) {
      motivos.push({
        campo: 'valorTotal',
        codigoRegra: 'VALOR_ACIMA_LIMITE',
        motivo: `O valor total (${doc.valorTotal}) excede o limite configurado (${regra.valorMaximoPermitido}).`,
      });
    }

    // 4. Participante (nome e documento em formato sintático de 11 ou 14 dígitos)
    if (!doc.participanteNome || !doc.participanteNome.trim()) {
      motivos.push({
        campo: 'participanteNome',
        codigoRegra: 'PARTICIPANTE_OBRIGATORIO',
        motivo: 'O nome do participante é obrigatório.',
      });
    }
    const docLimpo = (doc.participanteDocumento || '').replace(/\D/g, '');
    if (docLimpo.length !== 11 && docLimpo.length !== 14) {
      motivos.push({
        campo: 'participanteDocumento',
        codigoRegra: 'PARTICIPANTE_DOCUMENTO_INVALIDO',
        motivo:
          'O documento do participante deve possuir formato sintático de 11 ou 14 dígitos.',
      });
    }

    // 5. Códigos tributários (CFOP e CST/CSOSN)
    if (!doc.cfop || !/^\d{4}$/.test(doc.cfop)) {
      motivos.push({
        campo: 'cfop',
        codigoRegra: 'CFOP_INVALIDO',
        motivo: 'O CFOP deve possuir exatamente 4 dígitos.',
      });
    } else if (
      regra.cfopsPermitidos.length > 0 &&
      !regra.cfopsPermitidos.includes(doc.cfop)
    ) {
      motivos.push({
        campo: 'cfop',
        codigoRegra: 'CFOP_NAO_PERMITIDO',
        motivo: `O CFOP '${doc.cfop}' não está na lista de CFOPs permitidos para esta empresa.`,
      });
    }

    if (!doc.cst || !doc.cst.trim()) {
      motivos.push({
        campo: 'cst',
        codigoRegra: 'CST_OBRIGATORIO',
        motivo: 'O código CST/CSOSN é obrigatório.',
      });
    } else if (
      regra.cstsPermitidos.length > 0 &&
      !regra.cstsPermitidos.includes(doc.cst.trim())
    ) {
      motivos.push({
        campo: 'cst',
        codigoRegra: 'CST_NAO_PERMITIDO',
        motivo: `O código CST/CSOSN '${doc.cst}' não está permitido pela regra fiscal configurada.`,
      });
    }

    // 6. Duplicidade (CA-3)
    if (regra.bloquearDuplicidade) {
      const [notasEmpresa, docsImportados] = await Promise.all([
        this.notaRepo.listarPorEmpresa(empresaId),
        this.docImportadoRepo.listarPorEmpresa(empresaId),
      ]);

      if (doc.chaveAcesso?.trim()) {
        const chave = doc.chaveAcesso.trim();
        const dupChave = docsImportados.find((d) => d.chaveAcesso === chave);
        if (dupChave) {
          motivos.push({
            campo: 'chaveAcesso',
            codigoRegra: 'DOCUMENTO_DUPLICADO_CHAVE',
            motivo: `Documento duplicado: já existe documento importado com a chave de acesso '${chave}'.`,
          });
        }
      }

      const serie = (doc.serie || '1').trim();
      const numero = (doc.numero || '').trim();
      const participante = (doc.participanteNome || '').trim().toLowerCase();
      const dupNota = notasEmpresa.find(
        (n) =>
          n.status !== 'CANCELADA' &&
          n.tipo === doc.tipo &&
          n.numero === numero &&
          n.serie === serie &&
          n.participanteNome.trim().toLowerCase() === participante
      );
      if (dupNota) {
        motivos.push({
          campo: 'numero',
          codigoRegra: 'DOCUMENTO_DUPLICADO_NOTA',
          motivo: `Documento duplicado: já existe nota ${doc.tipo} número '${numero}' série '${serie}' para '${doc.participanteNome}'.`,
        });
      }
    }

    return {
      empresaId,
      valido: motivos.length === 0,
      motivos,
    };
  }
}
