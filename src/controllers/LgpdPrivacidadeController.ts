import { Request, Response } from 'express';
import { LgpdPrivacidadeService } from '../services/LgpdPrivacidadeService';

/**
 * Controller HTTP para Conformidade LGPD: Solicitações de Titulares e Incidentes
 * SPEC-1.11 (RNF-002)
 */
export class LgpdPrivacidadeController {
  constructor(private readonly service: LgpdPrivacidadeService) {}

  /**
   * POST /api/lgpd/solicitacoes-titulares (Registra pedido do titular - CA-2 e CA-4)
   */
  public registrarSolicitacao = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizacaoId, titularNome, titularContato, tipoDireito, descricao } =
        req.body;

      const solicitacao = await this.service.registrarSolicitacaoTitular({
        organizacaoId,
        titularNome,
        titularContato,
        tipoDireito,
        descricao,
      });

      res.status(201).json({
        sucesso: true,
        dados: solicitacao,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * PATCH /api/lgpd/solicitacoes-titulares/:id (Atualiza atendimento do pedido do titular - CA-2)
   */
  public atualizarAtendimento = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id || '');
      const { status, justificativaResposta } = req.body;

      const atualizada = await this.service.atualizarAtendimentoSolicitacao(id, {
        status,
        justificativaResposta,
      });

      res.status(200).json({
        sucesso: true,
        dados: atualizada,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * GET /api/lgpd/solicitacoes-titulares (Lista solicitações de titulares - CA-2)
   */
  public listarSolicitacoes = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizacaoId = String(req.query.organizacaoId || '');
      const lista = await this.service.listarSolicitacoesPorOrganizacao(organizacaoId);

      res.status(200).json({
        sucesso: true,
        dados: lista,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * POST /api/lgpd/incidentes (Registra incidente de privacidade - CA-3 e CA-4)
   */
  public registrarIncidente = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        organizacaoId,
        titulo,
        descricao,
        dadosAfetados,
        severidade,
        medidasAdotadas,
        registradoPorUsuarioId,
      } = req.body;

      const incidente = await this.service.registrarIncidente({
        organizacaoId,
        titulo,
        descricao,
        dadosAfetados,
        severidade,
        medidasAdotadas,
        registradoPorUsuarioId,
      });

      res.status(201).json({
        sucesso: true,
        dados: incidente,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * PATCH /api/lgpd/incidentes/:id (Atualiza status de tratamento de incidente - CA-3)
   */
  public atualizarIncidente = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id || '');
      const { status, medidasAdotadas } = req.body;

      const atualizado = await this.service.atualizarStatusIncidente(
        id,
        status,
        medidasAdotadas
      );

      res.status(200).json({
        sucesso: true,
        dados: atualizado,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * GET /api/lgpd/incidentes (Lista incidentes de privacidade - CA-3)
   */
  public listarIncidentes = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizacaoId = String(req.query.organizacaoId || '');
      const lista = await this.service.listarIncidentesPorOrganizacao(organizacaoId);

      res.status(200).json({
        sucesso: true,
        dados: lista,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };
}
