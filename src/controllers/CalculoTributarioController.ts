import { Request, Response } from 'express';
import { CalculoTributarioService } from '../services/CalculoTributarioService';

/**
 * Controller HTTP para Cálculo e Memória de Cálculo (SPEC-3.7 / RF-020, RF-021, RF-027, RNF-012)
 */
export class CalculoTributarioController {
  constructor(private readonly service: CalculoTributarioService) {}

  public cadastrarRegra = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.cadastrarRegra({
        empresaId,
        ...req.body,
      });
      res.status(201).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public calcular = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.calcular(empresaId, req.body);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      const status = erro.statusCode || 400;
      res.status(status).json({ sucesso: false, erro: erro.message });
    }
  };

  public listarCalculos = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.listarCalculos(empresaId);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };
}
