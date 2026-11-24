import { Router } from 'express';
import { PatrimonioEstoqueController } from '../controllers/PatrimonioEstoqueController';

/**
 * Rotas HTTP para Patrimônio e Estoque (SPEC-2.13 / RF-057 a RF-060)
 */
export function criarPatrimonioEstoqueRouter(
  controller: PatrimonioEstoqueController
): Router {
  const router = Router();

  router.post('/empresas/:empresaId/patrimonio/bens', controller.cadastrarBem);
  router.get('/empresas/:empresaId/patrimonio/bens', controller.listarBens);
  router.post(
    '/empresas/:empresaId/patrimonio/bens/:bemId/depreciar',
    controller.registrarEncargo
  );
  router.post(
    '/empresas/:empresaId/patrimonio/bens/:bemId/transferir',
    controller.transferirBem
  );
  router.post(
    '/empresas/:empresaId/patrimonio/bens/:bemId/reavaliar',
    controller.reavaliarBem
  );
  router.post(
    '/empresas/:empresaId/patrimonio/bens/:bemId/baixar',
    controller.baixarBem
  );
  router.post('/empresas/:empresaId/estoque/importar', controller.importarEstoque);
  router.get(
    '/empresas/:empresaId/estoque/saldos',
    controller.consultarSaldosEstoque
  );

  return router;
}
