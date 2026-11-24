import { Request, Response } from 'express';
import { PeriodoContabilService } from '../services/PeriodoContabilService';

/**
 * Controller HTTP para controle de Períodos Contábeis
 * SPEC-2.5 (RF-012 e RB-002)
 */
export class PeriodoContabilController {
  constructor(private readonly service: PeriodoContabilService) {}

  /**
   * GET /api/empresas/:empresaId/periodos (Lista períodos da empresa - CA-1)
   */
  public listar = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const periodos = await this.service.listarPorEmpresa(empresaId);

      res.status(200).json({
        sucesso: true,
        dados: periodos,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * POST /api/empresas/:empresaId/periodos/:competencia/fechamento (Transiciona para EM_FECHAMENTO - CA-1)
   */
  public iniciarFechamento = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const competencia = String(req.params.competencia || '');
      const usuarioId = req.body?.usuarioId ? String(req.body.usuarioId) : undefined;

      const periodo = await this.service.iniciarFechamento(
        empresaId,
        competencia,
        usuarioId
      );

      res.status(200).json({
        sucesso: true,
        dados: periodo,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * POST /api/empresas/:empresaId/periodos/:competencia/encerrar (Transiciona para ENCERRADO - CA-1 / CA-2)
   */
  public encerrar = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const competencia = String(req.params.competencia || '');
      const usuarioId = req.body?.usuarioId ? String(req.body.usuarioId) : undefined;

      const periodo = await this.service.encerrarPeriodo(empresaId, competencia, usuarioId);

      res.status(200).json({
        sucesso: true,
        dados: periodo,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * POST /api/empresas/:empresaId/periodos/:competencia/reabrir (Reabre período ENCERRADO com permissão, justificativa e auditoria - CA-3 / CA-4)
   */
  public reabrir = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const competencia = String(req.params.competencia || '');
      const { usuarioId, justificativa } = req.body;

      const periodo = await this.service.reabrirPeriodo({
        empresaId,
        competencia,
        usuarioId,
        justificativa,
      });

      res.status(200).json({
        sucesso: true,
        dados: periodo,
      });
    } catch (erro: any) {
      const status = erro.message?.includes('Acesso negado') ? 403 : 400;
      res.status(status).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };
}
