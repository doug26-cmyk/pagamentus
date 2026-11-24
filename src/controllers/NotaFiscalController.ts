import { Request, Response } from 'express';
import { NotaFiscalService } from '../services/NotaFiscalService';

/**
 * Controller HTTP para Notas Fiscais de Entrada, Saída e Serviços (SPEC-3.2 / RF-017)
 */
export class NotaFiscalController {
  constructor(private readonly service: NotaFiscalService) {}

  public registrar = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.registrarNota({ empresaId, ...req.body });
      res.status(201).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public listar = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.listarPorEmpresa(empresaId);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public buscarPorId = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const notaId = String(req.params.notaId || '');
      const dados = await this.service.buscarPorId(empresaId, notaId);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(404).json({ sucesso: false, erro: erro.message });
    }
  };

  public cancelar = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const notaId = String(req.params.notaId || '');
      const dados = await this.service.cancelarNota(empresaId, notaId, req.body);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public registrarDevolucao = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const notaId = String(req.params.notaId || '');
      const dados = await this.service.registrarDevolucao(
        empresaId,
        notaId,
        req.body
      );
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public registrarAjuste = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const notaId = String(req.params.notaId || '');
      const dados = await this.service.registrarAjuste(
        empresaId,
        notaId,
        req.body
      );
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };
}
