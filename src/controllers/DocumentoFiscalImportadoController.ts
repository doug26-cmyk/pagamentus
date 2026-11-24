import { Request, Response } from 'express';
import { DocumentoFiscalImportadoService } from '../services/DocumentoFiscalImportadoService';

/**
 * Controller HTTP para Importação e Integridade de Documentos Fiscais (SPEC-3.1 / RF-016)
 */
export class DocumentoFiscalImportadoController {
  constructor(private readonly service: DocumentoFiscalImportadoService) {}

  public importar = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.importarDocumento({
        empresaId,
        ...req.body,
      });
      res.status(201).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public listar = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.listarPorEmpresa(empresaId);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public buscarPorId = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const id = String(req.params.id || '');
      const dados = await this.service.buscarPorId(empresaId, id);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(404).json({ sucesso: false, erro: erro.message });
    }
  };

  public verificarIntegridade = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const id = String(req.params.id || '');
      const hashEsperado = req.query.hashEsperado
        ? String(req.query.hashEsperado)
        : undefined;

      const dados = await this.service.verificarIntegridade(
        empresaId,
        id,
        hashEsperado
      );
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(404).json({ sucesso: false, erro: erro.message });
    }
  };
}
