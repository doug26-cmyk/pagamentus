import { Router } from 'express';
import { ClassificacaoOperacaoController } from '../controllers/ClassificacaoOperacaoController';

/**
 * Rotas HTTP para Classificação das Operações (SPEC-3.4 / RF-019)
 */
export function criarClassificacaoOperacaoRouter(
  controller: ClassificacaoOperacaoController
): Router {
  const router = Router();

  router.post(
    '/empresas/:empresaId/fiscal/classificacao/regras',
    controller.cadastrarRegra
  );
  router.get(
    '/empresas/:empresaId/fiscal/classificacao/regras',
    controller.listarRegras
  );
  router.post(
    '/empresas/:empresaId/fiscal/classificar',
    controller.classificar
  );
  router.get(
    '/empresas/:empresaId/fiscal/classificacoes',
    controller.listarClassificacoes
  );

  return router;
}
