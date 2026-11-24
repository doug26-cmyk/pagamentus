import { Request, Response } from 'express';
import { RegraTributariaVersionadaService } from '../services/RegraTributariaVersionadaService';

/**
 * Controller HTTP para Regras Tributárias Versionadas (SPEC-3.5 / RF-080, RB-004)
 */
export class RegraTributariaVersionadaController {
  constructor(private readonly service: RegraTributariaVersionadaService) {}

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

  public atualizarRegra = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const codigoRegra = String(req.params.codigoRegra || '');
      const dados = await this.service.atualizarRegra(
        empresaId,
        codigoRegra,
        req.body
      );
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public listarRegras = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const codigoRegra = req.query.codigoRegra
        ? String(req.query.codigoRegra)
        : undefined;
      const dados = await this.service.listarRegras(empresaId, codigoRegra);
      res.status(200).json({ sucesso: true, dados });
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
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };
}
