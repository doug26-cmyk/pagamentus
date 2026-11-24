import { DocumentoFiscalImportado } from '../models/DocumentoFiscalImportadoModel';

/**
 * Interface do repositório de Documentos Fiscais Importados (SPEC-3.1)
 */
export interface IDocumentoFiscalImportadoRepository {
  salvar(doc: DocumentoFiscalImportado): Promise<DocumentoFiscalImportado>;
  buscarPorId(id: string): Promise<DocumentoFiscalImportado | null>;
  listarPorEmpresa(empresaId: string): Promise<DocumentoFiscalImportado[]>;
  limpar(): Promise<void>;
}

/**
 * Repositório em memória para Documentos Fiscais Importados
 */
export class InMemoryDocumentoFiscalImportadoRepository
  implements IDocumentoFiscalImportadoRepository
{
  private documentos: Map<string, DocumentoFiscalImportado> = new Map();

  async salvar(
    doc: DocumentoFiscalImportado
  ): Promise<DocumentoFiscalImportado> {
    this.documentos.set(doc.id, doc);
    return doc;
  }

  async buscarPorId(id: string): Promise<DocumentoFiscalImportado | null> {
    return this.documentos.get(id) || null;
  }

  async listarPorEmpresa(
    empresaId: string
  ): Promise<DocumentoFiscalImportado[]> {
    const lista: DocumentoFiscalImportado[] = [];
    for (const doc of this.documentos.values()) {
      if (doc.empresaId === empresaId) {
        lista.push(doc);
      }
    }
    return lista.sort(
      (a, b) => a.importadoEm.getTime() - b.importadoEm.getTime()
    );
  }

  async limpar(): Promise<void> {
    this.documentos.clear();
  }
}
