import { Request, Response } from 'express';
import { TipoRetencao } from '../models/RetencaoCreditoParcelamentoModel';
import { RetencaoCreditoParcelamentoService } from '../services/RetencaoCreditoParcelamentoService';

/**
 * Controller HTTP para Retenções, Créditos, Compensações, Parcelamentos e Vencimentos
 * (SPEC-3.8 / RF-022)
 */
export class RetencaoCreditoParcelamentoController {
  constructor(private readonly service: RetencaoCreditoParcelamentoService) {}

  public registrarRetencao = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.registrarRetencao({
        empresaId,
        ...req.body,
      });
      res.status(201).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public listarRetencoes = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const tipo = req.query.tipo
        ? (String(req.query.tipo) as TipoRetencao)
        : undefined;
      const dados = await this.service.listarRetencoes(empresaId, tipo);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public registrarCredito = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.registrarCredito({
        empresaId,
        ...req.body,
      });
      res.status(201).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public listarCreditos = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.listarCreditos(empresaId);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public aplicarCompensacao = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.aplicarCompensacao({
        empresaId,
        ...req.body,
      });
      res.status(201).json({ sucesso: true, dados });
    } catch (erro: any) {
      const status = erro.statusCode || 400;
      res.status(status).json({ sucesso: false, erro: erro.message });
    }
  };

  public cadastrarParcelamento = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.cadastrarParcelamento({
        empresaId,
        ...req.body,
      });
      res.status(201).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public listarParcelamentos = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.listarParcelamentos(empresaId);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public pagarParcela = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const parcelamentoId = String(req.params.parcelamentoId || '');
      const numero = Number(req.params.numero);
      const dados = await this.service.pagarParcela({
        empresaId,
        parcelamentoId,
        numero,
        dataPagamento: String(req.body?.dataPagamento || ''),
      });
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      const status = erro.statusCode || 400;
      res.status(status).json({ sucesso: false, erro: erro.message });
    }
  };

  public listarVencimentos = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const referencia = String(
        req.query.referencia || new Date().toISOString().slice(0, 10)
      );
      const ate = req.query.ate ? String(req.query.ate) : undefined;
      const dados = await this.service.listarVencimentos(
        empresaId,
        referencia,
        ate
      );
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };
}
