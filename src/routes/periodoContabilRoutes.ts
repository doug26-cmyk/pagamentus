import { Router } from 'express';
import { PeriodoContabilController } from '../controllers/PeriodoContabilController';

/**
 * Rotas de controle de Períodos Contábeis (SPEC-2.5 / RF-012 / RB-002)
 */
export function criarPeriodoContabilRouter(
  controller: PeriodoContabilController
): Router {
  const router = Router();

  router.get('/empresas/:empresaId/periodos', controller.listar);
  router.post(
    '/empresas/:empresaId/periodos/:competencia/fechamento',
    controller.iniciarFechamento
  );
  router.post(
    '/empresas/:empresaId/periodos/:competencia/encerrar',
    controller.encerrar
  );
  router.post(
    '/empresas/:empresaId/periodos/:competencia/reabrir',
    controller.reabrir
  );

  return router;
}
