import { Request, Response } from 'express';
import { BaixaTituloService } from '../services/BaixaTituloService';

/**
 * Controller HTTP para Baixas, Juros, Multas, Descontos, Estornos e Inadimplência (SPEC-2.10)
 */
export class BaixaTituloController {
  constructor(private readonly service: BaixaTituloService) {}

  /**
   * POST /api/empresas/:empresaId/titulos/:tituloId/parcelas/:numeroParcela/baixas (CA-1 e CA-4)
   */
  public registrarBaixa = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const tituloId = String(req.params.tituloId || '');
      const numeroParcela = Number(req.params.numeroParcela);

      const dados = await this.service.registrarBaixa({
        empresaId,
        tituloId,
        numeroParcela,
        ...req.body,
      });

      res.status(201).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  /**
   * POST /api/empresas/:empresaId/baixas/:baixaId/estorno (CA-2 e CA-4)
   */
  public estornarBaixa = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const baixaId = String(req.params.baixaId || '');
      const motivo = req.body?.motivo ? String(req.body.motivo) : undefined;

      const dados = await this.service.estornarBaixa(empresaId, baixaId, motivo);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  /**
   * GET /api/empresas/:empresaId/titulos/:tituloId/parcelas/situacao (CA-1 e CA-2)
   */
  public obterSituacaoParcelas = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const tituloId = String(req.params.tituloId || '');
      const dataReferencia = req.query.dataReferencia
        ? String(req.query.dataReferencia)
        : undefined;

      const dados = await this.service.obterSituacaoParcelas(
        empresaId,
        tituloId,
        dataReferencia
      );
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  /**
   * POST /api/empresas/:empresaId/inadimplencia/verificar (CA-3)
   */
  public verificarInadimplencia = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dataReferencia = String(req.body?.dataReferencia || '');

      const dados = await this.service.verificarInadimplencia(
        empresaId,
        dataReferencia
      );
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };
}
