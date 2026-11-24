import { Request, Response } from 'express';
import { ConciliacaoService } from '../services/ConciliacaoService';

/**
 * Controller HTTP para Conciliação Contábil e Bancária (SPEC-2.11)
 */
export class ConciliacaoController {
  constructor(private readonly service: ConciliacaoService) {}

  /**
   * POST /api/empresas/:empresaId/conciliacao/extratos (CA-1 e CA-4)
   */
  public importarExtrato = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.importarExtrato({
        empresaId,
        ...req.body,
      });
      res.status(201).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  /**
   * GET /api/empresas/:empresaId/conciliacao/extratos
   */
  public listarExtratos = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.listarExtratos(empresaId);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  /**
   * POST /api/empresas/:empresaId/conciliacao/itens/:itemId/confirmar (CA-2 e CA-4)
   */
  public confirmarManualmente = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const itemId = String(req.params.itemId || '');
      const dados = await this.service.confirmarManualmente(
        empresaId,
        itemId,
        req.body
      );
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  /**
   * POST /api/empresas/:empresaId/conciliacao/saldos (CA-3 e CA-4)
   */
  public conciliarSaldos = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.conciliarSaldos(empresaId, req.body);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };
}
