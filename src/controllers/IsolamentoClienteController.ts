import { Response, NextFunction } from 'express';
import { RequisicaoAutenticada } from './AutenticacaoController';
import { IsolamentoClienteService } from '../services/IsolamentoClienteService';
import { CriptografiaSegurancaService } from '../services/CriptografiaSegurancaService';

/**
 * Controller HTTP para Segregação entre Clientes, Menor Privilégio e Segurança TLS/Dados
 * SPEC-1.5 (RB-008 e RNF-001)
 */
export class IsolamentoClienteController {
  constructor(
    private readonly isolamentoService: IsolamentoClienteService,
    private readonly criptoService: CriptografiaSegurancaService
  ) {}

  /**
   * Middleware de proteção de tráfego TLS/HTTPS (RNF-001 / CA-4):
   * - Define cabeçalho Strict-Transport-Security (HSTS)
   * - Bloqueia tráfego HTTP inseguro quando REQUIRE_TLS está ativo
   */
  public middlewareTransporteTls = (
    req: RequisicaoAutenticada,
    res: Response,
    next: NextFunction
  ): void => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    const exigirTls =
      process.env.REQUIRE_TLS === 'true' || req.headers['x-require-tls'] === 'true';

    const seguro = this.criptoService.validarTransporteTls({
      protocolo: req.protocol,
      cabecalhoForwardedProto: req.headers['x-forwarded-proto'] as string | undefined,
      exigirTls,
    });

    if (!seguro) {
      res.status(403).json({
        sucesso: false,
        erro: 'Tráfego inseguro recusado: conexão criptografada via TLS/HTTPS é obrigatória (RNF-001).',
      });
      return;
    }

    next();
  };

  /**
   * POST /api/clientes/:clienteId/autorizacoes (Concede autorização expressa a outro usuário - CA-2)
   */
  public concederAutorizacao = async (
    req: RequisicaoAutenticada,
    res: Response
  ): Promise<void> => {
    try {
      const clienteId = String(req.params.clienteId);
      const solicitanteUsuarioId = req.usuarioAutenticadoId!;
      const { usuarioAutorizadoId, expiraEm } = req.body;

      const autorizacao = await this.isolamentoService.concederAutorizacaoExpressa({
        solicitanteUsuarioId,
        clienteId,
        usuarioAutorizadoId,
        expiraEm: expiraEm ? new Date(expiraEm) : null,
      });

      res.status(201).json({
        sucesso: true,
        dados: autorizacao,
      });
    } catch (erro: any) {
      const status = erro.message?.includes('Acesso negado') ? 403 : 400;
      res.status(status).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * DELETE /api/clientes/:clienteId/autorizacoes/:autorizacaoId (Revoga autorização expressa)
   */
  public revogarAutorizacao = async (
    req: RequisicaoAutenticada,
    res: Response
  ): Promise<void> => {
    try {
      const clienteId = String(req.params.clienteId);
      const autorizacaoId = String(req.params.autorizacaoId);
      const solicitanteUsuarioId = req.usuarioAutenticadoId!;

      const revogada = await this.isolamentoService.revogarAutorizacaoExpressa(
        autorizacaoId,
        clienteId,
        solicitanteUsuarioId
      );

      res.status(200).json({
        sucesso: true,
        dados: revogada,
      });
    } catch (erro: any) {
      const status = erro.message?.includes('Acesso negado') ? 403 : 400;
      res.status(status).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * POST /api/clientes/:clienteId/registros (Cria registro com dado sensível criptografado - CA-1, CA-3, CA-4)
   */
  public criarRegistro = async (req: RequisicaoAutenticada, res: Response): Promise<void> => {
    try {
      const clienteId = String(req.params.clienteId);
      const solicitanteUsuarioId = req.usuarioAutenticadoId!;
      const { titulo, dadoSensivel } = req.body;

      const registro = await this.isolamentoService.criarRegistroCliente({
        solicitanteUsuarioId,
        clienteId,
        titulo,
        dadoSensivel,
      });

      res.status(201).json({
        sucesso: true,
        dados: registro,
      });
    } catch (erro: any) {
      const status = erro.message?.includes('Acesso negado') ? 403 : 400;
      res.status(status).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * GET /api/clientes/:clienteId/registros (Lista registros validando isolamento e permissão - CA-1, CA-2, CA-3, CA-4)
   */
  public listarRegistros = async (req: RequisicaoAutenticada, res: Response): Promise<void> => {
    try {
      const clienteId = String(req.params.clienteId);
      const solicitanteUsuarioId = req.usuarioAutenticadoId!;

      const registros = await this.isolamentoService.listarRegistrosDoCliente(
        solicitanteUsuarioId,
        clienteId
      );

      res.status(200).json({
        sucesso: true,
        dados: registros,
      });
    } catch (erro: any) {
      const status = erro.message?.includes('Acesso negado') ? 403 : 400;
      res.status(status).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };

  /**
   * DELETE /api/clientes/:clienteId/registros/:registroId (Exclui registro validando menor privilégio - CA-1, CA-3)
   */
  public excluirRegistro = async (req: RequisicaoAutenticada, res: Response): Promise<void> => {
    try {
      const clienteId = String(req.params.clienteId);
      const registroId = String(req.params.registroId);
      const solicitanteUsuarioId = req.usuarioAutenticadoId!;

      await this.isolamentoService.excluirRegistroDoCliente(
        solicitanteUsuarioId,
        clienteId,
        registroId
      );

      res.status(200).json({
        sucesso: true,
        mensagem: 'Registro excluído com sucesso.',
      });
    } catch (erro: any) {
      const status = erro.message?.includes('Acesso negado') ? 403 : 400;
      res.status(status).json({
        sucesso: false,
        erro: erro.message,
      });
    }
  };
}
