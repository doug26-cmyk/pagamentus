import { Request, Response } from 'express';
import { RelatorioContabilService } from '../services/RelatorioContabilService';

/**
 * Controller HTTP para geração de Balancete, Razão, Diário e Relatório Auxiliar (SPEC-2.7 / RF-013)
 */
export class RelatorioContabilController {
  constructor(private readonly service: RelatorioContabilService) {}

  /**
   * GET /api/empresas/:empresaId/relatorios/balancete?competencia=YYYY-MM (CA-1)
   */
  public obterBalancete = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const competencia = String(req.query.competencia || '');

      const dados = await this.service.gerarBalancete(empresaId, competencia);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  /**
   * GET /api/empresas/:empresaId/relatorios/razao?contaId=...&competencia=YYYY-MM (CA-2)
   */
  public obterRazao = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const contaId = String(req.query.contaId || '');
      const competencia = String(req.query.competencia || '');

      const dados = await this.service.gerarRazao(empresaId, contaId, competencia);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  /**
   * GET /api/empresas/:empresaId/relatorios/diario?competencia=YYYY-MM (CA-3)
   */
  public obterDiario = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const competencia = String(req.query.competencia || '');

      const dados = await this.service.gerarDiario(empresaId, competencia);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  /**
   * GET /api/empresas/:empresaId/relatorios/auxiliar?competencia=YYYY-MM (CA-4)
   */
  public obterRelatorioAuxiliar = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const competencia = String(req.query.competencia || '');

      const dados = await this.service.gerarRelatorioAuxiliar(
        empresaId,
        competencia
      );
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };
}
