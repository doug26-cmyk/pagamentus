import { Request, Response } from 'express';
import { DemonstracaoContabilService } from '../services/DemonstracaoContabilService';

/**
 * Controller HTTP para geração de Balanço, DRE, DFC e DMPL/DLPA (SPEC-2.8 / RF-013)
 */
export class DemonstracaoContabilController {
  constructor(private readonly service: DemonstracaoContabilService) {}

  /**
   * GET /api/empresas/:empresaId/demonstracoes/balanco?competencia=YYYY-MM (CA-1)
   */
  public obterBalanco = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const competencia = String(req.query.competencia || '');

      const dados = await this.service.gerarBalancoPatrimonial(
        empresaId,
        competencia
      );
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  /**
   * GET /api/empresas/:empresaId/demonstracoes/dre?competencia=YYYY-MM (CA-2)
   */
  public obterDRE = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const competencia = String(req.query.competencia || '');

      const dados = await this.service.gerarDRE(empresaId, competencia);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  /**
   * GET /api/empresas/:empresaId/demonstracoes/dfc?competencia=YYYY-MM (CA-3)
   */
  public obterDFC = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const competencia = String(req.query.competencia || '');

      const dados = await this.service.gerarDFC(empresaId, competencia);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  /**
   * GET /api/empresas/:empresaId/demonstracoes/dmpl?competencia=YYYY-MM (CA-3)
   */
  public obterDMPL = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const competencia = String(req.query.competencia || '');

      const dados = await this.service.gerarDMPL(empresaId, competencia);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };
}
