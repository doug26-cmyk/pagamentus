import { Router } from 'express';
import { AutenticacaoController } from '../controllers/AutenticacaoController';
import { IsolamentoClienteController } from '../controllers/IsolamentoClienteController';

/**
 * Rotas de Isolamento entre Clientes, Autorizações Expressas, Menor Privilégio e Segurança TLS (SPEC-1.5)
 */
export function criarIsolamentoClienteRouter(
  isolamentoController: IsolamentoClienteController,
  authController: AutenticacaoController
): Router {
  const router = Router();

  // Aplica middleware de transporte TLS/HSTS e verificação de sessão ativa em todas as rotas de clientes
  router.use(
    '/clientes',
    isolamentoController.middlewareTransporteTls,
    authController.middlewareSessaoAtiva
  );

  // Gestão de Autorizações Expressas entre clientes (RB-008 / CA-2)
  router.post(
    '/clientes/:clienteId/autorizacoes',
    isolamentoController.concederAutorizacao
  );
  router.delete(
    '/clientes/:clienteId/autorizacoes/:autorizacaoId',
    isolamentoController.revogarAutorizacao
  );

  // Operações segregadas por cliente com menor privilégio e criptografia de dados sensíveis (CA-1, CA-3, CA-4)
  router.post(
    '/clientes/:clienteId/registros',
    isolamentoController.criarRegistro
  );
  router.get(
    '/clientes/:clienteId/registros',
    isolamentoController.listarRegistros
  );
  router.delete(
    '/clientes/:clienteId/registros/:registroId',
    isolamentoController.excluirRegistro
  );

  return router;
}
