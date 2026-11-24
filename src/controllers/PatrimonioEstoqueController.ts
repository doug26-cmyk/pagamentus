import { Request, Response } from 'express';
import { PatrimonioEstoqueService } from '../services/PatrimonioEstoqueService';

/**
 * Controller HTTP para Patrimônio e Estoque (SPEC-2.13 / RF-057 a RF-060)
 */
export class PatrimonioEstoqueController {
  constructor(private readonly service: PatrimonioEstoqueService) {}

  public cadastrarBem = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.cadastrarBem({ empresaId, ...req.body });
      res.status(201).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public listarBens = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.listarBens(empresaId);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public registrarEncargo = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const bemId = String(req.params.bemId || '');
      const competencia = String(req.body?.competencia || '');
      const dados = await this.service.registrarEncargo(
        empresaId,
        bemId,
        competencia
      );
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public transferirBem = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const bemId = String(req.params.bemId || '');
      const dados = await this.service.transferirBem(empresaId, bemId, req.body);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public reavaliarBem = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const bemId = String(req.params.bemId || '');
      const dados = await this.service.reavaliarBem(empresaId, bemId, req.body);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public baixarBem = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const bemId = String(req.params.bemId || '');
      const dados = await this.service.baixarBem(empresaId, bemId, req.body);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public importarEstoque = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const itens = req.body?.itens;
      const dados = await this.service.importarEstoque(empresaId, itens);
      res.status(201).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public consultarSaldosEstoque = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.consultarSaldosEstoque(empresaId);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };
}
