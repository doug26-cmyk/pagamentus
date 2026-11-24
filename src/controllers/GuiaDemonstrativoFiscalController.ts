import { Request, Response } from 'express';
import { GuiaDemonstrativoFiscalService } from '../services/GuiaDemonstrativoFiscalService';

/**
 * Endpoints para preparação fiscal destinada exclusivamente à conferência.
 */
export class GuiaDemonstrativoFiscalController {
  constructor(private readonly service: GuiaDemonstrativoFiscalService) {}

  /**
   * Prepara uma guia e retorna o estado de transmissão de forma explícita.
   */
  public prepararGuia = (req: Request, res: Response): void => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = this.service.prepararGuia(empresaId, req.body?.dados);
      res.status(201).json({ sucesso: true, dados });
    } catch (erro: unknown) {
      const mensagem =
        erro instanceof Error ? erro.message : 'Falha inesperada ao preparar a guia.';
      res.status(erro instanceof Error ? 400 : 500).json({
        sucesso: false,
        erro: mensagem,
      });
    }
  };

  /**
   * Prepara um demonstrativo para conferência.
   */
  public prepararDemonstrativo = (req: Request, res: Response): void => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = this.service.prepararDemonstrativo(
        empresaId,
        req.body?.dados
      );
      res.status(201).json({ sucesso: true, dados });
    } catch (erro: unknown) {
      const mensagem =
        erro instanceof Error
          ? erro.message
          : 'Falha inesperada ao preparar o demonstrativo.';
      res.status(erro instanceof Error ? 400 : 500).json({
        sucesso: false,
        erro: mensagem,
      });
    }
  };
}
