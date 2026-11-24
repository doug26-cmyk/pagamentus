import { Request, Response } from 'express';
import { RegimeTributarioEmpresaService } from '../services/RegimeTributarioEmpresaService';

/**
 * Controller HTTP para Regimes Tributários por Empresa (SPEC-3.6 / RF-025, RF-026)
 */
export class RegimeTributarioEmpresaController {
  constructor(private readonly service: RegimeTributarioEmpresaService) {}

  public registrarOpcao = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.registrarOpcao({
        empresaId,
        ...req.body,
      });
      res.status(201).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public listarHistorico = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.listarHistorico(empresaId);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public consultarVigente = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const data = String(req.query.data || '');
      const dados = await this.service.consultarVigente(empresaId, data);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      const status = erro.statusCode || 400;
      res.status(status).json({ sucesso: false, erro: erro.message });
    }
  };
}
