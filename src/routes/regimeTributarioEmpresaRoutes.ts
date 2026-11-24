import { Router } from 'express';
import { RegimeTributarioEmpresaController } from '../controllers/RegimeTributarioEmpresaController';

/**
 * Rotas HTTP para Regimes Tributários por Empresa (SPEC-3.6 / RF-025, RF-026)
 */
export function criarRegimeTributarioEmpresaRouter(
  controller: RegimeTributarioEmpresaController
): Router {
  const router = Router();

  router.post(
    '/empresas/:empresaId/fiscal/regimes',
    controller.registrarOpcao
  );
  router.get(
    '/empresas/:empresaId/fiscal/regimes',
    controller.listarHistorico
  );
  router.get(
    '/empresas/:empresaId/fiscal/regimes/vigente',
    controller.consultarVigente
  );

  return router;
}
