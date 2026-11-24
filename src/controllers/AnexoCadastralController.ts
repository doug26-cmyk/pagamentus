import { Request, Response } from 'express';
import { AnexoCadastralService } from '../services/AnexoCadastralService';

/**
 * Controller HTTP para Anexos Cadastrais e Controle/Alerta de Validade
 * SPEC-1.8 (RF-003)
 */
export class AnexoCadastralController {
  constructor(private readonly service: AnexoCadastralService) {}

  /**
   * POST /api/cadastros/:pessoaEmpresaId/anexos (Anexa documento cadastral - CA-1 e CA-4)
   */
  public anexar = async (req: Request, res: Response): Promise<void> => {
    try {
      const pessoaEmpresaId = String(req.params.pessoaEmpresaId || '');
      const {
        organizacaoId,
        tipoAnexo,
        nomeArquivo,
        mimeType,
        tamanhoBytes,
        caminhoOuHashArquivo,
        dataEmissao,
        dataValidade,
        dataReferencia,
      } = req.body;

      const anexo = await this.service.anexarDocumento(
        {
          organizacaoId,
          pessoaEmpresaId,
          tipoAnexo,
          nomeArquivo,
          mimeType,
          tamanhoBytes,
          caminhoOuHashArquivo,
          dataEmissao,
          dataValidade,
        },
        dataReferencia
      );

      res.status(201).json({
        sucesso: true,
        dados: anexo,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * GET /api/cadastros/:pessoaEmpresaId/anexos (Lista anexos do cadastro com status de validade - CA-1, CA-2, CA-3)
   */
  public listarPorCadastro = async (req: Request, res: Response): Promise<void> => {
    try {
      const pessoaEmpresaId = String(req.params.pessoaEmpresaId || '');
      const dataReferencia = req.query.dataReferencia
        ? String(req.query.dataReferencia)
        : undefined;
      const diasAntecedencia = req.query.diasAntecedencia
        ? Number(req.query.diasAntecedencia)
        : undefined;

      const anexos = await this.service.listarAnexosPorCadastro(
        pessoaEmpresaId,
        dataReferencia,
        diasAntecedencia
      );

      res.status(200).json({
        sucesso: true,
        dados: anexos,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * GET /api/anexos/alertas-validade (Lista anexos vencidos ou a vencer - CA-2 e CA-3)
   */
  public listarAlertas = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizacaoId = req.query.organizacaoId
        ? String(req.query.organizacaoId)
        : undefined;
      const pessoaEmpresaId = req.query.pessoaEmpresaId
        ? String(req.query.pessoaEmpresaId)
        : undefined;
      const dataReferenciaIso = req.query.dataReferencia
        ? String(req.query.dataReferencia)
        : undefined;
      const diasAntecedencia = req.query.diasAntecedencia
        ? Number(req.query.diasAntecedencia)
        : undefined;

      const alertas = await this.service.listarAlertasValidade({
        organizacaoId,
        pessoaEmpresaId,
        dataReferenciaIso,
        diasAntecedencia,
      });

      res.status(200).json({
        sucesso: true,
        dados: alertas,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };
}
