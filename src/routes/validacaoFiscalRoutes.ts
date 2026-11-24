import { Router } from 'express';
import { ValidacaoFiscalController } from '../controllers/ValidacaoFiscalController';

/**
 * Rotas HTTP para Validação Fiscal e Duplicidades (SPEC-3.3 / RF-018)
 */
export function criarValidacaoFiscalRouter(
  controller: ValidacaoFiscalController
): Router {
  const router = Router();

  router.put(
    '/empresas/:empresaId/fiscal/regras-validacao',
    controller.configurarRegras
  );
  router.get(
    '/empresas/:empresaId/fiscal/regras-validacao',
    controller.obterRegras
  );
  router.post(
    '/empresas/:empresaId/fiscal/validar-documento',
    controller.validarDocumento
  );

  return router;
}
