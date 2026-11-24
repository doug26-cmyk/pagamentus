import { Request, Response } from 'express';
import { TipoDimensaoGerencial } from '../models/CentroCustoModel';
import { CentroCustoComparativoService } from '../services/CentroCustoComparativoService';

/**
 * Controller HTTP para Centros de Custo, Departamentos, Projetos, Unidades e Comparativos
 * SPEC-2.6 (RF-014)
 */
export class CentroCustoComparativoController {
  constructor(private readonly service: CentroCustoComparativoService) {}

  /**
   * POST /api/empresas/:empresaId/centros-custo (CA-1 e CA-4)
   */
  public cadastrar = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const { codigo, nome, tipo, ativo } = req.body;

      const dimensao = await this.service.cadastrarDimensao({
        empresaId,
        codigo,
        nome,
        tipo,
        ativo,
      });

      res.status(201).json({
        sucesso: true,
        dados: dimensao,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * GET /api/empresas/:empresaId/centros-custo (CA-1)
   */
  public listar = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const tipo = req.query.tipo
        ? (String(req.query.tipo) as TipoDimensaoGerencial)
        : undefined;

      const lista = await this.service.listarPorEmpresa(empresaId, tipo);

      res.status(200).json({
        sucesso: true,
        dados: lista,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * PATCH /api/empresas/:empresaId/centros-custo/:id/inativar
   */
  public inativar = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const id = String(req.params.id || '');
      const dimensao = await this.service.inativarDimensao(empresaId, id);

      res.status(200).json({
        sucesso: true,
        dados: dimensao,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * GET /api/empresas/:empresaId/centros-custo/comparativo (CA-3 e CA-4)
   */
  public gerarComparativo = async (req: Request, res: Response): Promise<void> => {
    try {
      const empresaId = String(req.params.empresaId || '');
      const periodoBase = String(req.query.periodoBase || '');
      const periodoComparado = String(req.query.periodoComparado || '');

      const relatorio = await this.service.gerarComparativoPeriodos(
        empresaId,
        periodoBase,
        periodoComparado
      );

      res.status(200).json({
        sucesso: true,
        dados: relatorio,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };
}
