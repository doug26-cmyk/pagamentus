import { Router } from 'express';
import { LgpdPrivacidadeController } from '../controllers/LgpdPrivacidadeController';

/**
 * Rotas de Conformidade LGPD: Solicitações de Titulares e Incidentes (SPEC-1.11 / RNF-002)
 */
export function criarLgpdPrivacidadeRouter(
  controller: LgpdPrivacidadeController
): Router {
  const router = Router();

  // Fluxo de solicitações de titulares (CA-2 e CA-4)
  router.post('/lgpd/solicitacoes-titulares', controller.registrarSolicitacao);
  router.patch('/lgpd/solicitacoes-titulares/:id', controller.atualizarAtendimento);
  router.get('/lgpd/solicitacoes-titulares', controller.listarSolicitacoes);

  // Registro e acompanhamento de incidentes de privacidade (CA-3 e CA-4)
  router.post('/lgpd/incidentes', controller.registrarIncidente);
  router.patch('/lgpd/incidentes/:id', controller.atualizarIncidente);
  router.get('/lgpd/incidentes', controller.listarIncidentes);

  return router;
}
