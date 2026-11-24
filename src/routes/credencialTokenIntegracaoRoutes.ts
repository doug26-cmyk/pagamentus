import { Router } from 'express';
import { CredencialTokenIntegracaoController } from '../controllers/CredencialTokenIntegracaoController';

/**
 * Rotas de Credenciais Protegidas e Tokens de Integração com Escopo Mínimo (SPEC-1.10 / RF-076)
 */
export function criarCredencialTokenIntegracaoRouter(
  controller: CredencialTokenIntegracaoController
): Router {
  const router = Router();

  // Configuração e listagem protegida de credenciais de integração (CA-1 e CA-4)
  router.post('/integracoes/credenciais', controller.configurarCredencial);
  router.get('/integracoes/credenciais', controller.listarCredenciais);

  // Emissão, validação de escopo mínimo, rotação e revogação de tokens (CA-2, CA-3 e CA-4)
  router.post('/integracoes/tokens', controller.emitirToken);
  router.post('/integracoes/validar-uso', controller.validarUsoToken);
  router.post('/integracoes/tokens/:id/rotacionar', controller.rotacionarToken);
  router.delete('/integracoes/tokens/:id', controller.revogarToken);

  return router;
}
