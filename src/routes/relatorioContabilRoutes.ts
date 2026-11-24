import { Router } from 'express';
import { RelatorioContabilController } from '../controllers/RelatorioContabilController';

/**
 * Rotas HTTP para relatórios contábeis básicos (SPEC-2.7 / RF-013)
 */
export function criarRelatorioContabilRouter(
  controller: RelatorioContabilController
): Router {
  const router = Router();

  router.get('/empresas/:empresaId/relatorios/balancete', controller.obterBalancete);
  router.get('/empresas/:empresaId/relatorios/razao', controller.obterRazao);
  router.get('/empresas/:empresaId/relatorios/diario', controller.obterDiario);
  router.get(
    '/empresas/:empresaId/relatorios/auxiliar',
    controller.obterRelatorioAuxiliar
  );

  return router;
}
