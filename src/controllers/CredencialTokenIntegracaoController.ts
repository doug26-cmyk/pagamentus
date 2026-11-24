import { Request, Response } from 'express';
import { CredencialTokenIntegracaoService } from '../services/CredencialTokenIntegracaoService';

/**
 * Controller HTTP para Credenciais Protegidas e Tokens de Integração com Escopo Mínimo
 * SPEC-1.10 (RF-076)
 */
export class CredencialTokenIntegracaoController {
  constructor(private readonly service: CredencialTokenIntegracaoService) {}

  /**
   * POST /api/integracoes/credenciais (Configura credencial protegida - CA-1 e CA-4)
   */
  public configurarCredencial = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        organizacaoId,
        nomeIntegracao,
        provedor,
        credencialSecreta,
        escoposPermitidos,
      } = req.body;

      const credencial = await this.service.configurarCredencial({
        organizacaoId,
        nomeIntegracao,
        provedor,
        credencialSecreta,
        escoposPermitidos,
      });

      res.status(201).json({
        sucesso: true,
        dados: credencial,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * GET /api/integracoes/credenciais (Lista credenciais sem expor segredos - CA-1)
   */
  public listarCredenciais = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizacaoId = String(req.query.organizacaoId || '');
      const credenciais = await this.service.listarCredenciais(organizacaoId);

      res.status(200).json({
        sucesso: true,
        dados: credenciais,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * POST /api/integracoes/tokens (Emite token com escopo mínimo - CA-2 e CA-4)
   */
  public emitirToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizacaoId, credencialId, nome, escopos } = req.body;

      const tokenEmitido = await this.service.emitirTokenIntegracao({
        organizacaoId,
        credencialId,
        nome,
        escopos,
      });

      res.status(201).json({
        sucesso: true,
        dados: tokenEmitido,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * POST /api/integracoes/validar-uso (Valida se o token está ativo e possui o escopo mínimo - CA-2 e CA-3)
   */
  public validarUsoToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const tokenHeader = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7).trim()
        : authHeader?.trim();
      const tokenBruto = tokenHeader || req.body.tokenBruto;
      const { escopoExigido } = req.body;

      const validado = await this.service.validarTokenComEscopo(tokenBruto, escopoExigido);

      res.status(200).json({
        sucesso: true,
        dados: validado,
      });
    } catch (erro: any) {
      const status = erro.message?.includes('Acesso negado') ? 403 : 401;
      res.status(status).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * POST /api/integracoes/tokens/:id/rotacionar (Rotaciona o token invalidando o anterior - CA-3)
   */
  public rotacionarToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const tokenId = String(req.params.id || '');
      const novoToken = await this.service.rotacionarToken(tokenId);

      res.status(200).json({
        sucesso: true,
        dados: novoToken,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * DELETE /api/integracoes/tokens/:id (Revoga imediatamente o token - CA-3)
   */
  public revogarToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const tokenId = String(req.params.id || '');
      const revogado = await this.service.revogarToken(tokenId);

      res.status(200).json({
        sucesso: true,
        dados: revogado,
      });
    } catch (erro: any) {
      res.status(400).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };
}
