import { Request, Response } from 'express';
import { RelatorioFinanceiroService } from '../services/RelatorioFinanceiroService';

/**
 * Controller HTTP para Fluxo de Caixa e Relatórios Financeiros (SPEC-2.12 / RF-049)
 */
export class RelatorioFinanceiroController {
  constructor(private readonly service: RelatorioFinanceiroService) {}

  public obterFluxoCaixa = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dataInicio = String(req.query.dataInicio || '');
      const dataFim = String(req.query.dataFim || '');

      const dados = await this.service.gerarFluxoCaixa(
        empresaId,
        dataInicio,
        dataFim
      );
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public obterPosicaoFinanceira = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dataReferencia = String(req.query.dataReferencia || '');

      const dados = await this.service.gerarPosicaoFinanceira(
        empresaId,
        dataReferencia
      );
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public obterAgingRecebiveis = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dataReferencia = String(req.query.dataReferencia || '');

      const dados = await this.service.gerarAgingRecebiveis(
        empresaId,
        dataReferencia
      );
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public obterPrevisaoPagamentos = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dataInicio = String(req.query.dataInicio || '');
      const dataFim = String(req.query.dataFim || '');
      const centroCustoId = req.query.centroCustoId
        ? String(req.query.centroCustoId)
        : undefined;

      const dados = await this.service.gerarPrevisaoPagamentos(
        empresaId,
        dataInicio,
        dataFim,
        centroCustoId
      );
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public obterPorCentroCusto = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.gerarRelatorioPorCentroCusto(empresaId);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };
}
