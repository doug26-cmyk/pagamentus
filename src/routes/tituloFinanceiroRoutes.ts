import { Router } from 'express';
import { TituloFinanceiroController } from '../controllers/TituloFinanceiroController';

/**
 * Rotas HTTP para Títulos a Pagar e a Receber e Vínculos (SPEC-2.9 / RF-046, RF-050)
 */
export function criarTituloFinanceiroRouter(
  controller: TituloFinanceiroController
): Router {
  const router = Router();

  router.post('/empresas/:empresaId/titulos', controller.cadastrar);
  router.get('/empresas/:empresaId/titulos', controller.listar);
  router.get('/empresas/:empresaId/titulos/:id', controller.buscarPorId);
  router.post(
    '/empresas/:empresaId/titulos/:id/vinculos',
    controller.registrarVinculos
  );

  return router;
}
