import { Router } from 'express';
import { RegraTributariaVersionadaController } from '../controllers/RegraTributariaVersionadaController';

/**
 * Rotas HTTP para Regras Tributárias Versionadas (SPEC-3.5 / RF-080, RB-004)
 */
export function criarRegraTributariaVersionadaRouter(
  controller: RegraTributariaVersionadaController
): Router {
  const router = Router();

  router.post(
    '/empresas/:empresaId/fiscal/regras-versionadas',
    controller.cadastrarRegra
  );
  router.put(
    '/empresas/:empresaId/fiscal/regras-versionadas/:codigoRegra',
    controller.atualizarRegra
  );
  router.get(
    '/empresas/:empresaId/fiscal/regras-versionadas',
    controller.listarRegras
  );
  router.post(
    '/empresas/:empresaId/fiscal/regras-versionadas/calcular',
    controller.calcular
  );

  return router;
}
