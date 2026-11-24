import { Router } from 'express';
import { DemonstracaoContabilController } from '../controllers/DemonstracaoContabilController';

/**
 * Rotas HTTP para demonstrações contábeis (SPEC-2.8 / RF-013)
 */
export function criarDemonstracaoContabilRouter(
  controller: DemonstracaoContabilController
): Router {
  const router = Router();

  router.get('/empresas/:empresaId/demonstracoes/balanco', controller.obterBalanco);
  router.get('/empresas/:empresaId/demonstracoes/dre', controller.obterDRE);
  router.get('/empresas/:empresaId/demonstracoes/dfc', controller.obterDFC);
  router.get('/empresas/:empresaId/demonstracoes/dmpl', controller.obterDMPL);

  return router;
}
