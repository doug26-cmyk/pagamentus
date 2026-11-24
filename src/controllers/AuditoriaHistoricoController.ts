import { Request, Response } from 'express';
import { OperacaoAuditoria } from '../models/AuditoriaHistoricoModel';
import { AuditoriaHistoricoService } from '../services/AuditoriaHistoricoService';

/**
 * Controller HTTP para Trilha de Auditoria e Histórico Cadastral Imutável
 * SPEC-1.9 (RF-015, RF-004, RNF-004 e RB-007)
 */
export class AuditoriaHistoricoController {
  constructor(private readonly service: AuditoriaHistoricoService) {}

  /**
   * POST /api/auditoria/logs (Registra evento de auditoria e histórico cadastral - CA-1, CA-2, CA-4)
   */
  public registrar = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        organizacaoId,
        usuarioId,
        objetoTipo,
        objetoId,
        operacao,
        resultado,
        justificativa,
        dadosAnteriores,
        dadosNovos,
      } = req.body;

      const log = await this.service.registrarEvento({
        organizacaoId,
        usuarioId,
        objetoTipo,
        objetoId,
        operacao,
        resultado,
        justificativa,
        dadosAnteriores,
        dadosNovos,
      });

      res.status(201).json({
        sucesso: true,
        dados: log,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * GET /api/auditoria/logs (Consulta logs de auditoria - CA-1)
   */
  public listar = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizacaoId = req.query.organizacaoId
        ? String(req.query.organizacaoId)
        : undefined;
      const operacao = req.query.operacao
        ? (String(req.query.operacao) as OperacaoAuditoria)
        : undefined;

      const logs = await this.service.listarLogs({ organizacaoId, operacao });

      res.status(200).json({
        sucesso: true,
        dados: logs,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * GET /api/auditoria/objetos/:objetoId/historico (Consulta histórico cadastral do objeto - CA-2)
   */
  public obterHistoricoObjeto = async (req: Request, res: Response): Promise<void> => {
    try {
      const objetoId = String(req.params.objetoId || '');
      const historico = await this.service.obterHistoricoObjeto(objetoId);

      res.status(200).json({
        sucesso: true,
        dados: historico,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * PUT / PATCH /api/auditoria/logs/:id (Bloqueia tentativa de edição de log - CA-3)
   */
  public tentarEditar = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id || '');
      await this.service.editarLog(id, req.body);
    } catch (erro: any) {
      res.status(403).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * DELETE /api/auditoria/logs/:id (Bloqueia tentativa de exclusão de log - CA-3)
   */
  public tentarExcluir = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id || '');
      await this.service.excluirLog(id);
    } catch (erro: any) {
      res.status(403).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };
}
