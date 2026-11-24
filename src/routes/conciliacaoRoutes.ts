import { Router } from 'express';
import { ConciliacaoController } from '../controllers/ConciliacaoController';

/**
 * Rotas HTTP para Conciliação Contábil e Bancária (SPEC-2.11 / RF-011, RF-048)
 */
export function criarConciliacaoRouter(
  controller: ConciliacaoController
): Router {
  const router = Router();

  router.post(
    '/empresas/:empresaId/conciliacao/extratos',
    controller.importarExtrato
  );
  router.get(
    '/empresas/:empresaId/conciliacao/extratos',
    controller.listarExtratos
  );
  router.post(
    '/empresas/:empresaId/conciliacao/itens/:itemId/confirmar',
    controller.confirmarManualmente
  );
  router.post(
    '/empresas/:empresaId/conciliacao/saldos',
    controller.conciliarSaldos
  );

  return router;
}
