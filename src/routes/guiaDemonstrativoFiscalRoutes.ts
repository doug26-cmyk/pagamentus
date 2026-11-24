import { Router } from 'express';
import { GuiaDemonstrativoFiscalController } from '../controllers/GuiaDemonstrativoFiscalController';

/**
 * Rotas para preparar guias e demonstrativos fiscais para conferência.
 */
export function criarGuiaDemonstrativoFiscalRouter(
  controller: GuiaDemonstrativoFiscalController
): Router {
  const router = Router();

  router.post(
    '/empresas/:empresaId/fiscal/guias',
    controller.prepararGuia
  );
  router.post(
    '/empresas/:empresaId/fiscal/demonstrativos',
    controller.prepararDemonstrativo
  );

  return router;
}
