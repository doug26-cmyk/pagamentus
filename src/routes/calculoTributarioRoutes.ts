import { Router } from 'express';
import { CalculoTributarioController } from '../controllers/CalculoTributarioController';

/**
 * Rotas HTTP para Cálculo e Memória de Cálculo (SPEC-3.7 / RF-020, RF-021, RF-027, RNF-012)
 */
export function criarCalculoTributarioRouter(
  controller: CalculoTributarioController
): Router {
  const router = Router();

  router.post(
    '/empresas/:empresaId/fiscal/calculo-regras',
    controller.cadastrarRegra
  );
  router.post(
    '/empresas/:empresaId/fiscal/calculos',
    controller.calcular
  );
  router.get(
    '/empresas/:empresaId/fiscal/calculos',
    controller.listarCalculos
  );

  return router;
}
