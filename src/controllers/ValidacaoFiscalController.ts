import { Request, Response } from 'express';
import { ValidacaoFiscalService } from '../services/ValidacaoFiscalService';

/**
 * Controller HTTP para Regras de Validação Fiscal e Duplicidades (SPEC-3.3 / RF-018)
 */
export class ValidacaoFiscalController {
  constructor(private readonly service: ValidacaoFiscalService) {}

  public configurarRegras = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.configurarRegras(empresaId, req.body);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public obterRegras = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const dados = await this.service.obterRegras(empresaId);
      res.status(200).json({ sucesso: true, dados });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };

  public validarDocumento = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const resultado = await this.service.validarDocumento(
        empresaId,
        req.body
      );

      if (!resultado.valido) {
        res.status(422).json({ sucesso: false, dados: resultado });
        return;
      }

      res.status(200).json({ sucesso: true, dados: resultado });
    } catch (erro: any) {
      res.status(400).json({ sucesso: false, erro: erro.message });
    }
  };
}
