import { Router } from 'express';
import { CentroCustoComparativoController } from '../controllers/CentroCustoComparativoController';

/**
 * Rotas de Centros de Custo, Departamentos, Projetos, Unidades e Comparativos por Período (SPEC-2.6)
 */
export function criarCentroCustoComparativoRouter(
  controller: CentroCustoComparativoController
): Router {
  const router = Router();

  router.post('/empresas/:empresaId/centros-custo', controller.cadastrar);
  router.get('/empresas/:empresaId/centros-custo', controller.listar);
  router.patch(
    '/empresas/:empresaId/centros-custo/:id/inativar',
    controller.inativar
  );
  router.get(
    '/empresas/:empresaId/centros-custo/comparativo',
    controller.gerarComparativo
  );

  return router;
}
