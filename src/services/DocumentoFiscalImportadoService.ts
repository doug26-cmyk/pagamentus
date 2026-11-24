import * as crypto from 'crypto';
import {
  DocumentoFiscalImportado,
  ResultadoVerificacaoIntegridade,
  TipoDocumentoFiscal,
} from '../models/DocumentoFiscalImportadoModel';
import { IDocumentoFiscalImportadoRepository } from '../repositories/DocumentoFiscalImportadoRepository';

const TIPOS_DOCUMENTO_VALIDOS: TipoDocumentoFiscal[] = [
  'NFE',
  'NFSE',
  'CTE',
  'NFCE',
  'ARQUIVO_FISCAL',
];

/**
 * Serviço para importação de documentos fiscais preservando o arquivo original
 * e garantindo verificação de integridade via SHA-256 (SPEC-3.1 / RF-016)
 */
export class DocumentoFiscalImportadoService {
  constructor(private readonly repo: IDocumentoFiscalImportadoRepository) {}

  /**
   * Calcula hash SHA-256 em hexadecimal sobre o conteúdo original em UTF-8
   */
  public calcularHashSha256(conteudo: string): string {
    return crypto.createHash('sha256').update(conteudo, 'utf8').digest('hex');
  }

  /**
   * Importa documento fiscal preservando o conteúdo original e seu hash (CA-1 e CA-4)
   */
  public async importarDocumento(dados: {
    empresaId: string;
    nomeArquivo: string;
    tipoDocumento: TipoDocumentoFiscal;
    sistemaAutorizadoOrigem: string;
    chaveAcesso?: string;
    conteudoOriginal: string;
  }): Promise<DocumentoFiscalImportado> {
    const empresaId = (dados.empresaId || '').trim();
    if (!empresaId) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    if (!dados.nomeArquivo?.trim()) {
      throw new Error('O nome do arquivo é obrigatório.');
    }
    if (!TIPOS_DOCUMENTO_VALIDOS.includes(dados.tipoDocumento)) {
      throw new Error(
        `Tipo de documento inválido. Valores permitidos: ${TIPOS_DOCUMENTO_VALIDOS.join(', ')}.`
      );
    }
    if (!dados.sistemaAutorizadoOrigem?.trim()) {
      throw new Error('O sistema autorizado de origem é obrigatório.');
    }
    if (
      typeof dados.conteudoOriginal !== 'string' ||
      dados.conteudoOriginal.length === 0
    ) {
      throw new Error('O conteúdo original do arquivo não pode estar vazio.');
    }

    // Preserva o conteúdo original exatamente como recebido (sem trim/alteração)
    const hashSha256 = this.calcularHashSha256(dados.conteudoOriginal);
    const tamanhoBytes = Buffer.byteLength(dados.conteudoOriginal, 'utf8');

    const doc: DocumentoFiscalImportado = {
      id: crypto.randomUUID(),
      empresaId,
      nomeArquivo: dados.nomeArquivo.trim(),
      tipoDocumento: dados.tipoDocumento,
      sistemaAutorizadoOrigem: dados.sistemaAutorizadoOrigem.trim(),
      chaveAcesso: dados.chaveAcesso?.trim() || undefined,
      conteudoOriginal: dados.conteudoOriginal,
      tamanhoBytes,
      hashSha256,
      importadoEm: new Date(),
    };

    return this.repo.salvar(doc);
  }

  public async listarPorEmpresa(
    empresaId: string
  ): Promise<DocumentoFiscalImportado[]> {
    if (!empresaId || !empresaId.trim()) {
      throw new Error('O identificador da empresa é obrigatório.');
    }
    return this.repo.listarPorEmpresa(empresaId);
  }

  public async buscarPorId(
    empresaId: string,
    id: string
  ): Promise<DocumentoFiscalImportado> {
    const doc = await this.repo.buscarPorId(id);
    if (!doc || doc.empresaId !== empresaId) {
      throw new Error('Documento fiscal não encontrado para esta empresa.');
    }
    return doc;
  }

  /**
   * Recalcula o hash SHA-256 do conteúdo preservado e compara com o armazenado
   * (e com eventual hash esperado informado na consulta) (CA-2 e CA-3)
   */
  public async verificarIntegridade(
    empresaId: string,
    id: string,
    hashEsperado?: string
  ): Promise<ResultadoVerificacaoIntegridade> {
    const doc = await this.buscarPorId(empresaId, id);
    const hashRecalculado = this.calcularHashSha256(doc.conteudoOriginal);
    const hashInformado = hashEsperado?.trim().toLowerCase();

    const integro = hashInformado
      ? hashRecalculado === doc.hashSha256 && hashRecalculado === hashInformado
      : hashRecalculado === doc.hashSha256;

    return {
      documentoId: doc.id,
      empresaId: doc.empresaId,
      hashArmazenado: doc.hashSha256,
      hashRecalculado,
      hashEsperadoInformado: hashInformado,
      integro,
    };
  }
}
