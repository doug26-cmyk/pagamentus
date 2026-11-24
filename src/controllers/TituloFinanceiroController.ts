import { Request, Response } from 'express';
import { TituloFinanceiroService } from '../services/TituloFinanceiroService';

/**
 * Controller HTTP para Títulos a Pagar/Receber, Parcelas, Anexos e Vínculos (SPEC-2.9)
 */
export class TituloFinanceiroController {
  constructor(private readonly service: TituloFinanceiroService) {}

  /**
   * POST /api/empresas/:empresaId/titulos (CA-1 e CA-4)
   */
  public cadastrar = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const titulo = await this.service.cadastrarTitulo({
        empresaId,
        ...req.body,
      });

      res.status(201).json({ sucesso: true, dados: titulo });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  /**
   * GET /api/empresas/:empresaId/titulos (CA-3)
   */
  public listar = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const lista = await this.service.listarPorEmpresa(empresaId);

      res.status(200).json({ sucesso: true, dados: lista });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  /**
   * GET /api/empresas/:empresaId/titulos/:id (CA-3)
   */
  public buscarPorId = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const id = String(req.params.id || '');
      const titulo = await this.service.buscarPorId(empresaId, id);

      res.status(200).json({ sucesso: true, dados: titulo });
    } catch (erro: any) {
      res.status(404).json({ sucesso: false, erro: erro.message });
    }
  };

  /**
   * POST /api/empresas/:empresaId/titulos/:id/vinculos (CA-2 e CA-4)
   */
  public registrarVinculos = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const id = String(req.params.id || '');
      const titulo = await this.service.registrarVinculosEAnexos(
        empresaId,
        id,
        req.body
      );

      res.status(200).json({ sucesso: true, dados: titulo });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };
}
